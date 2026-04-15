import type { Request, Response } from "express";

const COOKIE_NAMES = {
  accessToken: "garden_home_oidc_access_token",
  refreshToken: "garden_home_oidc_refresh_token",
  oidcState: "garden_home_oidc_state",
} as const;

type SessionTokens = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
};

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

function getCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
  };
}

export function readKeycloakSessionTokens(req: Request) {
  const cookies = parseCookies(req);
  return {
    accessToken: cookies[COOKIE_NAMES.accessToken],
    refreshToken: cookies[COOKIE_NAMES.refreshToken],
  };
}

export function setSessionCookies(
  res: Response,
  secure: boolean,
  tokens: SessionTokens
): void {
  const cookieOptions = getCookieOptions(secure);

  res.cookie(COOKIE_NAMES.accessToken, tokens.access_token, {
    ...cookieOptions,
    maxAge: Math.max((tokens.expires_in ?? 300) * 1000, 60_000),
  });
  if (tokens.refresh_token) {
    res.cookie(COOKIE_NAMES.refreshToken, tokens.refresh_token, {
      ...cookieOptions,
      maxAge: Math.max((tokens.refresh_expires_in ?? 86_400) * 1000, 60_000),
    });
  }
}

export function clearKeycloakSessionCookies(res: Response, secure: boolean): void {
  const cookieOptions = getCookieOptions(secure);
  res.clearCookie(COOKIE_NAMES.accessToken, cookieOptions);
  res.clearCookie(COOKIE_NAMES.refreshToken, cookieOptions);
}

export function readOidcStateCookie(req: Request): string | undefined {
  return parseCookies(req)[COOKIE_NAMES.oidcState];
}

export function setOidcStateCookie(
  res: Response,
  secure: boolean,
  value: string,
  maxAgeMs: number
): void {
  res.cookie(COOKIE_NAMES.oidcState, value, {
    ...getCookieOptions(secure),
    maxAge: maxAgeMs,
  });
}

export function clearOidcStateCookie(res: Response, secure: boolean): void {
  res.clearCookie(COOKIE_NAMES.oidcState, getCookieOptions(secure));
}
