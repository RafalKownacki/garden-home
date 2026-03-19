import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../config.js";
import type { JwtClaims } from "../types/auth.js";
import { buildUserAccessProfile } from "./user-access-profile.js";

declare global {
  namespace Express {
    interface Request {
      authClaims?: JwtClaims;
      userProfile?: ReturnType<typeof buildUserAccessProfile>;
    }
  }
}

const jwks = createRemoteJWKSet(new URL(config.keycloakJwksUrl));

function isPublicPath(method: string, path: string): boolean {
  return config.authPublicPaths.includes(`${method.toUpperCase()} ${path}`);
}

function hasExpectedAudience(claims: JwtClaims): boolean {
  const audience = claims.aud;
  if (typeof audience === "string" && audience === config.keycloakAudience) return true;
  if (Array.isArray(audience) && audience.includes(config.keycloakAudience)) return true;
  return claims.azp === config.keycloakAudience;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (isPublicPath(req.method, req.path)) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "NO_SESSION_TOKEN" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ error: "NO_SESSION_TOKEN" });
    return;
  }

  try {
    const verified = await jwtVerify(token, jwks, {
      issuer: config.keycloakIssuer
    });

    const claims = verified.payload as JwtClaims;
    if (!hasExpectedAudience(claims)) {
      res.status(401).json({ error: "INVALID_AUDIENCE" });
      return;
    }

    req.authClaims = claims;
    req.userProfile = buildUserAccessProfile(claims);
    next();
  } catch {
    res.status(401).json({ error: "INVALID_TOKEN" });
  }
}
