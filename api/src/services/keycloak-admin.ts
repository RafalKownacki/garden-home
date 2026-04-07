import { config } from "../config.js";

type KcUser = {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
};

type KcRoleMapping = {
  realmMappings?: Array<{ name: string }>;
  clientMappings?: Record<string, { mappings: Array<{ name: string }> }>;
};

async function getAdminToken(): Promise<string> {
  const res = await fetch(
    `${config.keycloakAdminUrl}/realms/master/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: "admin-cli",
        grant_type: "password",
        username: config.keycloakAdminUsername,
        password: config.keycloakAdminPassword
      })
    }
  );
  if (!res.ok) throw new Error(`Keycloak admin token failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export type KcUserWithRoles = {
  userId: string;
  username: string;
  displayName: string | null;
  realmRoles: string[];
  clientRoles: Record<string, string[]>;
};

export async function listUsersWithRoles(): Promise<KcUserWithRoles[]> {
  const token = await getAdminToken();
  const base = `${config.keycloakAdminUrl}/admin/realms/${config.keycloakRealm}`;
  const headers = { Authorization: `Bearer ${token}` };

  const usersRes = await fetch(`${base}/users?max=500&enabled=true`, { headers });
  if (!usersRes.ok) throw new Error(`Failed to list users: ${usersRes.status}`);
  const users = (await usersRes.json()) as KcUser[];

  const results = await Promise.all(
    users.map(async (user) => {
      const rolesRes = await fetch(`${base}/users/${user.id}/role-mappings`, { headers });
      const roles: KcRoleMapping = rolesRes.ok ? ((await rolesRes.json()) as KcRoleMapping) : {};

      const realmRoles = (roles.realmMappings ?? []).map((r) => r.name);
      const clientRoles = Object.fromEntries(
        Object.entries(roles.clientMappings ?? {}).map(([clientId, val]) => [
          clientId,
          val.mappings.map((r) => r.name)
        ])
      );

      const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;

      return {
        userId: user.id,
        username: user.username,
        displayName,
        realmRoles,
        clientRoles
      };
    })
  );

  return results;
}
