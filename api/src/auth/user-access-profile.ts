import type { JwtClaims } from "../types/auth.js";
import type { UserAccessProfile } from "../../../shared/app-types.js";
import { resolvePrincipalType } from "../services/service-account-utils.js";

export function buildUserAccessProfile(claims: JwtClaims): UserAccessProfile {
  const clientRoles = Object.fromEntries(
    Object.entries(claims.resource_access ?? {}).map(([clientId, value]) => [clientId, value.roles ?? []])
  );
  const realmRoles = claims.realm_access?.roles ?? [];

  return {
    userId: claims.sub ?? "unknown",
    username: claims.preferred_username ?? "unknown",
    displayName: claims.name ?? claims.preferred_username ?? null,
    principalType: resolvePrincipalType({
      principalType: claims.principal_type,
      alternatePrincipalType: claims.grdn_principal_type,
      realmRoles,
      username: claims.preferred_username ?? null,
    }),
    realmRoles,
    clientRoles
  };
}
