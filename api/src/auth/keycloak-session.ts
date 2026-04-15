import crypto from "node:crypto";
import type { Request, Response } from "express";
import { config } from "../config.js";
import { verifyKeycloakAccessToken } from "./keycloak-token.js";

const COOKIE_NAMES = {
  accessToken: "garden_home_oidc_access_token",
  refreshToken: "garden_home_oidc_refresh_token"
} as const;

const LOGIN_STATE_TTL_MS = 10 * 60 * 1000;

type PendingLoginState = {
  codeVerifier: string;
  redirectUri: string;
  returnTo: string;
  createdAt: number;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  error?: string;
};

const pendingLoginByState = new Map<string, PendingLoginState>();

function parseCookies(req: Request): Record<string, string> {
  const raw = String(req.headers.cookie || "");
  if (!raw) return {};

  const cookies: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }

  return cookies;
}

function getForwardedHeader(req: Request, name: string): string {
  return String(req.headers[name] || "").split(",")[0].trim();
}

function resolveRequestOrigin(req: Request): string {
  const forwardedProto = getForwardedHeader(req, "x-forwarded-proto");
  const forwardedHost = getForwardedHeader(req, "x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const origin = String(req.headers.origin || "").trim();
  if (/^https?:\/\//i.test(origin)) {
    return origin.replace(/\/$/, "");
  }

  const referer = String(req.headers.referer || "").trim();
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // ignore invalid referer
    }
  }

  if (/^https?:\/\//i.test(config.corsOrigin)) {
    return config.corsOrigin.replace(/\/$/, "");
  }

  const proto = forwardedProto || req.protocol || "http";
  const host = forwardedHost || String(req.get("host") || "").trim() || "localhost";
  return `${proto}://${host}`;
}

function getSafeReturnPath(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.includes("\n") || value.includes("\r")) return "/";
  if (value.startsWith("/api/")) return "/";
  if (value.startsWith("/v1/auth/")) return "/";
  return value;
}

function appendAuthError(pathname: string, authError: string): string {
  const base = pathname || "/";
  const url = new URL(base, "http://local");
  url.searchParams.set("authError", authError);
  return `${url.pathname}${url.search}`;
}

function shouldSecureCookies(req: Request): boolean {
  return resolveRequestOrigin(req).startsWith("https://");
}

function cleanupExpiredStates(): void {
  const now = Date.now();
  for (const [state, entry] of pendingLoginByState.entries()) {
    if (now - entry.createdAt > LOGIN_STATE_TTL_MS) {
      pendingLoginByState.delete(state);
    }
  }
}

function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createCodeVerifier(): string {
  return toBase64Url(crypto.randomBytes(48));
}

function createCodeChallenge(verifier: string): string {
  return toBase64Url(crypto.createHash("sha256").update(verifier).digest());
}

function createAuthEndpoint(): string {
  return `${config.keycloakIssuer.replace(/\/$/, "")}/protocol/openid-connect/auth`;
}

function createTokenEndpoint(): string {
  return `${config.keycloakIssuer.replace(/\/$/, "")}/protocol/openid-connect/token`;
}

async function performTokenRequest(params: URLSearchParams): Promise<TokenResponse> {
  params.set("client_id", config.keycloakClientId);
  if (config.keycloakClientSecret) {
    params.set("client_secret", config.keycloakClientSecret);
  }

  const response = await fetch(createTokenEndpoint(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });

  const payload = (await response.json()) as TokenResponse;
  if (!response.ok || typeof payload.access_token !== "string") {
    throw new Error(payload.error || `token_exchange_failed:${response.status}`);
  }

  return payload;
}

function setSessionCookies(req: Request, res: Response, tokens: TokenResponse): void {
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldSecureCookies(req),
    path: "/"
  };

  res.cookie(COOKIE_NAMES.accessToken, tokens.access_token, {
    ...cookieOptions,
    maxAge: Math.max((tokens.expires_in ?? 300) * 1000, 60_000)
  });
  if (tokens.refresh_token) {
    res.cookie(COOKIE_NAMES.refreshToken, tokens.refresh_token, {
      ...cookieOptions,
      maxAge: Math.max((tokens.refresh_expires_in ?? 86_400) * 1000, 60_000)
    });
  }
}

export function clearKeycloakSessionCookies(req: Request, res: Response): void {
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: shouldSecureCookies(req),
    path: "/"
  };

  res.clearCookie(COOKIE_NAMES.accessToken, cookieOptions);
  res.clearCookie(COOKIE_NAMES.refreshToken, cookieOptions);
}

function readKeycloakSessionTokens(req: Request) {
  const cookies = parseCookies(req);
  return {
    accessToken: cookies[COOKIE_NAMES.accessToken],
    refreshToken: cookies[COOKIE_NAMES.refreshToken]
  };
}

export async function tryAuthenticateKeycloakSession(req: Request, res: Response) {
  const { accessToken, refreshToken } = readKeycloakSessionTokens(req);

  if (accessToken) {
    try {
      return await verifyKeycloakAccessToken(accessToken);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "FORBIDDEN" || error.message === "INVALID_AUDIENCE")
      ) {
        throw error;
      }
      // Refresh below if available.
    }
  }

  if (refreshToken) {
    try {
      const refreshed = await performTokenRequest(
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken
        })
      );
      setSessionCookies(req, res, {
        ...refreshed,
        refresh_token: refreshed.refresh_token || refreshToken
      });
      return await verifyKeycloakAccessToken(refreshed.access_token!);
    } catch (error) {
      clearKeycloakSessionCookies(req, res);
      if (
        error instanceof Error &&
        (error.message === "FORBIDDEN" || error.message === "INVALID_AUDIENCE")
      ) {
        throw error;
      }
      return null;
    }
  }

  if (accessToken) {
    clearKeycloakSessionCookies(req, res);
  }

  return null;
}

export async function handleKeycloakLogin(req: Request, res: Response): Promise<void> {
  cleanupExpiredStates();

  const forceLogin = String(req.query.force || "").trim() === "1";
  const returnTo = getSafeReturnPath(req.query.returnTo);
  const existing = await tryAuthenticateKeycloakSession(req, res);
  if (existing && !forceLogin) {
    res.redirect(302, returnTo);
    return;
  }

  if (forceLogin) {
    clearKeycloakSessionCookies(req, res);
  }

  const state = crypto.randomUUID();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);
  const redirectUri = `${resolveRequestOrigin(req)}/api/v1/auth/callback`;

  pendingLoginByState.set(state, {
    codeVerifier,
    redirectUri,
    returnTo,
    createdAt: Date.now()
  });

  const authUrl = new URL(createAuthEndpoint());
  authUrl.searchParams.set("client_id", config.keycloakClientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid profile email");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  if (forceLogin) {
    authUrl.searchParams.set("prompt", "login");
    authUrl.searchParams.set("max_age", "0");
  }

  res.redirect(302, authUrl.toString());
}

export async function handleKeycloakCallback(req: Request, res: Response): Promise<void> {
  cleanupExpiredStates();

  const state = String(req.query.state || "").trim();
  const pending = state ? pendingLoginByState.get(state) : undefined;
  if (state) pendingLoginByState.delete(state);
  const returnTo = pending?.returnTo || "/";

  const oidcError = String(req.query.error || "").trim();
  if (oidcError) {
    clearKeycloakSessionCookies(req, res);
    const authError = oidcError === "access_denied" ? "access_denied" : "login_failed";
    res.redirect(302, appendAuthError(returnTo, authError));
    return;
  }

  const code = String(req.query.code || "").trim();
  if (!pending || !code) {
    clearKeycloakSessionCookies(req, res);
    res.redirect(302, appendAuthError(returnTo, "login_failed"));
    return;
  }

  try {
    const tokens = await performTokenRequest(
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: pending.redirectUri,
        code_verifier: pending.codeVerifier
      })
    );

    await verifyKeycloakAccessToken(tokens.access_token!);
    setSessionCookies(req, res, tokens);
    res.redirect(302, returnTo);
  } catch (error) {
    clearKeycloakSessionCookies(req, res);
    const authError = error instanceof Error && error.message === "FORBIDDEN" ? "forbidden" : "login_failed";
    res.redirect(302, appendAuthError(returnTo, authError));
  }
}

export function handleKeycloakLogout(req: Request, res: Response): void {
  clearKeycloakSessionCookies(req, res);
  const returnTo = getSafeReturnPath(req.method.toUpperCase() === "GET" ? req.query.returnTo : req.body?.returnTo);

  if (req.method.toUpperCase() === "GET") {
    res.redirect(302, returnTo || "/login");
    return;
  }

  res.json({ ok: true });
}
