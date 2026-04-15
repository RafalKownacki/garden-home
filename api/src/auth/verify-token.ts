import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import type { JwtClaims } from "../types/auth.js";
import { tryAuthenticateKeycloakSession } from "./keycloak-session.js";
import { verifyKeycloakAccessToken } from "./keycloak-token.js";
import { buildUserAccessProfile } from "./user-access-profile.js";

declare global {
  namespace Express {
    interface Request {
      authClaims?: JwtClaims;
      userProfile?: ReturnType<typeof buildUserAccessProfile>;
    }
  }
}

function isPublicPath(method: string, path: string): boolean {
  return config.authPublicPaths.includes(`${method.toUpperCase()} ${path}`);
}

function attachVerifiedAuth(
  req: Request,
  verified: {
    claims: JwtClaims;
    userProfile: ReturnType<typeof buildUserAccessProfile>;
  }
): void {
  req.authClaims = verified.claims;
  req.userProfile = verified.userProfile;
}

async function tryAuthenticateRequest(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      throw new Error("NO_SESSION_TOKEN");
    }
    return await verifyKeycloakAccessToken(token);
  }

  return await tryAuthenticateKeycloakSession(req, res);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authenticated = await tryAuthenticateRequest(req, res);
    if (authenticated) {
      attachVerifiedAuth(req, authenticated);
    }

    if (isPublicPath(req.method, req.path)) {
      next();
      return;
    }

    if (!authenticated) {
      res.status(401).json({ error: "NO_SESSION_TOKEN" });
      return;
    }

    next();
  } catch (err) {
    const errorCode =
      err instanceof Error && (err.message === "INVALID_AUDIENCE" || err.message === "FORBIDDEN")
        ? err.message
        : "INVALID_TOKEN";
    console.log("[auth] INVALID_TOKEN for", req.method, req.path, String(err).slice(0, 120));
    res.status(errorCode === "FORBIDDEN" ? 403 : 401).json({ error: errorCode });
  }
}
