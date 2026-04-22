import { config } from "../config.js";
import {
  resolvePrincipalType,
  SERVICE_ACCOUNT_ROLE_TOKEN,
  type PrincipalType,
} from "./service-account-utils.js";

type KcUser = {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
};

type KcRoleMapping = {
  realmMappings?: Array<{ name: string }>;
  clientMappings?: Record<string, { mappings: Array<{ name: string }> }>;
};

type KcClient = {
  id: string;
  clientId: string;
  serviceAccountsEnabled?: boolean;
};

type KcRealmRole = {
  id: string;
  name: string;
  description?: string;
  composite?: boolean;
  clientRole?: boolean;
  containerId?: string;
};

const KEYCLOAK_PAGE_SIZE = 200;
const ROLE_MAPPING_CONCURRENCY = 10;
const SERVICE_ACCOUNT_SYNC_CONCURRENCY = 5;
const KEYCLOAK_REQUEST_TIMEOUT_MS = 10_000;

async function fetchResponse(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KEYCLOAK_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Keycloak request failed: ${response.status} ${url}`);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetchResponse(url, init);
  return (await response.json()) as T;
}

async function fetchVoid(url: string, init?: RequestInit): Promise<void> {
  await fetchResponse(url, init);
}

async function getAdminToken(): Promise<string> {
  const data = await fetchJson<{ access_token: string }>(
    `${config.keycloakAdminUrl}/realms/master/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: "admin-cli",
        grant_type: "password",
        username: config.keycloakAdminUsername,
        password: config.keycloakAdminPassword,
      }).toString(),
    }
  );
  return data.access_token;
}

async function listEnabledUsers(base: string, headers: HeadersInit): Promise<KcUser[]> {
  const users: KcUser[] = [];
  let first = 0;

  for (;;) {
    const batch = await fetchJson<KcUser[]>(
      `${base}/users?first=${first}&max=${KEYCLOAK_PAGE_SIZE}&enabled=true`,
      { headers }
    );
    users.push(...batch);

    if (batch.length < KEYCLOAK_PAGE_SIZE) {
      return users;
    }

    first += batch.length;
  }
}

async function listClients(base: string, headers: HeadersInit): Promise<KcClient[]> {
  const clients: KcClient[] = [];
  let first = 0;

  for (;;) {
    const batch = await fetchJson<KcClient[]>(
      `${base}/clients?first=${first}&max=${KEYCLOAK_PAGE_SIZE}`,
      { headers }
    );
    clients.push(...batch);

    if (batch.length < KEYCLOAK_PAGE_SIZE) {
      return clients;
    }

    first += batch.length;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const current = index;
      index += 1;
      if (current >= items.length) return;
      results[current] = await mapper(items[current]);
    }
  });

  await Promise.all(workers);
  return results;
}

async function listRealmRoleMappings(
  base: string,
  headers: HeadersInit,
  userId: string
): Promise<Array<{ name: string }>> {
  return fetchJson<Array<{ name: string }>>(`${base}/users/${userId}/role-mappings/realm`, {
    headers,
  });
}

async function fetchUserWithRoles(
  base: string,
  headers: HeadersInit,
  user: KcUser
): Promise<KcUserWithRoles> {
  const roles = await fetchJson<KcRoleMapping>(
    `${base}/users/${user.id}/role-mappings`,
    { headers }
  );

  const realmRoles = (roles.realmMappings ?? []).map((role) => role.name);
  const clientRoles = Object.fromEntries(
    Object.entries(roles.clientMappings ?? {}).map(([clientId, value]) => [
      clientId,
      value.mappings.map((role) => role.name),
    ])
  );

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;

  return {
    userId: user.id,
    username: user.username,
    email: user.email ?? null,
    displayName,
    principalType: resolvePrincipalType({
      realmRoles,
      username: user.username,
    }),
    realmRoles,
    clientRoles,
  };
}

function createAdminContext(token: string): { base: string; headers: HeadersInit } {
  return {
    base: `${config.keycloakAdminUrl}/admin/realms/${config.keycloakRealm}`,
    headers: { Authorization: `Bearer ${token}` },
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type KcUserWithRoles = {
  userId: string;
  username: string;
  email: string | null;
  displayName: string | null;
  principalType: PrincipalType;
  realmRoles: string[];
  clientRoles: Record<string, string[]>;
};

export type ServiceAccountMarkerSyncSummary = {
  scannedClients: number;
  processedServiceAccounts: number;
  assignedMarkers: number;
  alreadyMarked: number;
  failed: Array<{
    clientId: string;
    error: string;
  }>;
};

export async function listUsersWithRoles(): Promise<KcUserWithRoles[]> {
  const token = await getAdminToken();
  const { base, headers } = createAdminContext(token);
  const users = await listEnabledUsers(base, headers);

  return mapWithConcurrency(users, ROLE_MAPPING_CONCURRENCY, (user) =>
    fetchUserWithRoles(base, headers, user)
  );
}

export async function syncServiceAccountMarkers(): Promise<ServiceAccountMarkerSyncSummary> {
  const token = await getAdminToken();
  const { base, headers } = createAdminContext(token);
  const clients = await listClients(base, headers);
  const serviceClients = clients.filter((client) => client.serviceAccountsEnabled);
  const markerRole = await fetchJson<KcRealmRole>(
    `${base}/roles/${SERVICE_ACCOUNT_ROLE_TOKEN}`,
    { headers }
  );

  const results = await mapWithConcurrency(
    serviceClients,
    SERVICE_ACCOUNT_SYNC_CONCURRENCY,
    async (client) => {
      try {
        const user = await fetchJson<KcUser>(
          `${base}/clients/${client.id}/service-account-user`,
          { headers }
        );
        const realmRoles = await listRealmRoleMappings(base, headers, user.id);
        if (realmRoles.some((role) => role.name === SERVICE_ACCOUNT_ROLE_TOKEN)) {
          return { status: "already" as const };
        }

        await fetchVoid(`${base}/users/${user.id}/role-mappings/realm`, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([markerRole]),
        });

        return { status: "assigned" as const };
      } catch (error) {
        return {
          status: "failed" as const,
          clientId: client.clientId,
          error: toErrorMessage(error),
        };
      }
    }
  );

  const failed = results
    .filter((result): result is { status: "failed"; clientId: string; error: string } =>
      result.status === "failed"
    )
    .map((result) => ({
      clientId: result.clientId,
      error: result.error,
    }));

  return {
    scannedClients: clients.length,
    processedServiceAccounts: serviceClients.length,
    assignedMarkers: results.filter((result) => result.status === "assigned").length,
    alreadyMarked: results.filter((result) => result.status === "already").length,
    failed,
  };
}
