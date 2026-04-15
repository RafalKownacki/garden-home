import test from "node:test";
import assert from "node:assert/strict";
import { listUsersWithRoles } from "../src/services/keycloak-admin.js";

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
