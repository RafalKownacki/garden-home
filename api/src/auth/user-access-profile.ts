import type { JwtClaims } from "../types/auth.js";
import type { UserAccessProfile } from "../../../shared/app-types.js";

export function buildUserAccessProfile(claims: JwtClaims): UserAccessProfile {
  const clientRoles = Object.fromEntries(
    Object.entries(claims.resource_access ?? {}).map(([clientId, value]) => [clientId, value.roles ?? []])
  );

  return {
    userId: claims.sub ?? "unknown",
    username: claims.preferred_username ?? "unknown",
    displayName: claims.name ?? claims.preferred_username ?? null,
    realmRoles: claims.realm_access?.roles ?? [],
    clientRoles
  };
}
