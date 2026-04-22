import test from "node:test";
import assert from "node:assert/strict";
import {
  listUsersWithRoles,
  syncServiceAccountMarkers,
} from "../src/services/keycloak-admin.js";

const createJsonResponse = (payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

test("listUsersWithRoles paginates enabled users and merges role mappings", async (t) => {
  const originalFetch = global.fetch;
  const usersPageOne = Array.from({ length: 200 }, (_, index) => ({
    id: `user-${index + 1}`,
    username: `user.${index + 1}`,
    firstName: `User${index + 1}`,
    lastName: "Test",
    enabled: true,
  }));
  const usersPageTwo = [
    {
      id: "user-201",
      username: "user.201",
      firstName: "User201",
      lastName: "Test",
      enabled: true,
    },
  ];
  const seenUrls: string[] = [];

  global.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    seenUrls.push(url);

    if (url.includes("/protocol/openid-connect/token")) {
      return createJsonResponse({ access_token: "admin-token" });
    }

    if (url.includes("/users?first=0&max=200&enabled=true")) {
      return createJsonResponse(usersPageOne);
    }

    if (url.includes("/users?first=200&max=200&enabled=true")) {
      return createJsonResponse(usersPageTwo);
    }

    if (url.includes("/role-mappings")) {
      const userId = url.split("/users/")[1]?.split("/")[0];
      return createJsonResponse({
        realmMappings: [{ name: userId === "user-201" ? "admin" : "employee.viewer" }],
        clientMappings: {
          "garden-home-app": {
            mappings: [{ name: "viewer" }],
          },
        },
      });
    }

    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  t.after(() => {
    global.fetch = originalFetch;
  });

  const users = await listUsersWithRoles();

  assert.equal(users.length, 201);
  assert.equal(users[0].displayName, "User1 Test");
  assert.deepEqual(users[0].clientRoles["garden-home-app"], ["viewer"]);
  assert.deepEqual(users[200].realmRoles, ["admin"]);
  assert.ok(seenUrls.some((url) => url.includes("/users?first=0&max=200&enabled=true")));
  assert.ok(seenUrls.some((url) => url.includes("/users?first=200&max=200&enabled=true")));
});

test("syncServiceAccountMarkers assigns canonical role only to missing service accounts", async (t) => {
  const originalFetch = global.fetch;
  const seenPosts: Array<{ url: string; body: string }> = [];

  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (url.includes("/protocol/openid-connect/token")) {
      return createJsonResponse({ access_token: "admin-token" });
    }

    if (url.includes("/clients?first=0&max=200")) {
      return createJsonResponse([
        { id: "client-1", clientId: "assetsmcp", serviceAccountsEnabled: true },
        { id: "client-2", clientId: "garden-home-app", serviceAccountsEnabled: false },
        { id: "client-3", clientId: "beo-mcp", serviceAccountsEnabled: true },
      ]);
    }

    if (url.endsWith("/roles/grdn-service-account")) {
      return createJsonResponse({
        id: "role-1",
        name: "grdn-service-account",
        description: "service marker",
      });
    }

    if (url.endsWith("/clients/client-1/service-account-user")) {
      return createJsonResponse({
        id: "user-1",
        username: "service-account-assetsmcp",
        enabled: true,
      });
    }

    if (url.endsWith("/clients/client-3/service-account-user")) {
      return createJsonResponse({
        id: "user-3",
        username: "service-account-beo-mcp",
        enabled: true,
      });
    }

    if (url.endsWith("/users/user-1/role-mappings/realm") && init?.method !== "POST") {
      return createJsonResponse([]);
    }

    if (url.endsWith("/users/user-3/role-mappings/realm") && init?.method !== "POST") {
      return createJsonResponse([{ name: "grdn-service-account" }]);
    }

    if (url.endsWith("/users/user-1/role-mappings/realm") && init?.method === "POST") {
      seenPosts.push({ url, body: String(init.body) });
      return new Response(null, { status: 204 });
    }

    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  t.after(() => {
    global.fetch = originalFetch;
  });

  const summary = await syncServiceAccountMarkers();

  assert.deepEqual(summary, {
    scannedClients: 3,
    processedServiceAccounts: 2,
    assignedMarkers: 1,
    alreadyMarked: 1,
    failed: [],
  });
  assert.equal(seenPosts.length, 1);
  assert.ok(seenPosts[0]?.url.endsWith("/users/user-1/role-mappings/realm"));
  assert.match(seenPosts[0]?.body ?? "", /grdn-service-account/);
});
