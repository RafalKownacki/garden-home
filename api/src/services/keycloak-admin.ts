import { config } from "../config.js";

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

const KEYCLOAK_PAGE_SIZE = 200;
const ROLE_MAPPING_CONCURRENCY = 10;
const KEYCLOAK_REQUEST_TIMEOUT_MS = 10_000;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
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
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
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
    realmRoles,
    clientRoles,
  };
}

export type KcUserWithRoles = {
  userId: string;
  username: string;
  email: string | null;
  displayName: string | null;
  realmRoles: string[];
  clientRoles: Record<string, string[]>;
};

export async function listUsersWithRoles(): Promise<KcUserWithRoles[]> {
  const token = await getAdminToken();
  const base = `${config.keycloakAdminUrl}/admin/realms/${config.keycloakRealm}`;
  const headers = { Authorization: `Bearer ${token}` };
  const users = await listEnabledUsers(base, headers);

  return mapWithConcurrency(users, ROLE_MAPPING_CONCURRENCY, (user) =>
    fetchUserWithRoles(base, headers, user)
  );
}
