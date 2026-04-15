import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config.js";
import type { JwtClaims } from "../types/auth.js";
import { buildUserAccessProfile } from "./user-access-profile.js";

const jwks = createRemoteJWKSet(new URL(config.keycloakJwksUrl));

function hasExpectedAudience(claims: JwtClaims): boolean {
  const audience = claims.aud;
  if (typeof audience === "string" && audience === config.keycloakAudience) return true;
  if (Array.isArray(audience) && audience.includes(config.keycloakAudience)) return true;
  return claims.azp === config.keycloakAudience;
}

function hasRequiredRealmRole(claims: JwtClaims): boolean {
  if (!config.keycloakRequiredRealmRoles.length) return true;
  const roles = claims.realm_access?.roles ?? [];
  return config.keycloakRequiredRealmRoles.some((role) => roles.includes(role));
}

export async function verifyKeycloakAccessToken(token: string) {
  const verified = await jwtVerify(token, jwks, {
    issuer: config.keycloakIssuer
  });

  const claims = verified.payload as JwtClaims;
  if (!hasExpectedAudience(claims)) {
    throw new Error("INVALID_AUDIENCE");
  }
  if (!hasRequiredRealmRole(claims)) {
    throw new Error("FORBIDDEN");
  }

  return {
    claims,
    userProfile: buildUserAccessProfile(claims)
  };
}
