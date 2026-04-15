import crypto from "node:crypto";
import type { Request, Response } from "express";
import { config } from "../config.js";
import {
  appendAuthError,
  getSafeReturnPath,
  resolveRequestOrigin,
  shouldSecureCookies,
} from "./keycloak-request-utils.js";
import { verifyKeycloakAccessToken } from "./keycloak-token.js";
import {
  createAuthEndpoint,
  createCodeChallenge,
  createCodeVerifier,
  performTokenRequest,
} from "./keycloak-oidc-client.js";
import {
  decodeOidcLoginState,
  encodeOidcLoginState,
  LOGIN_STATE_TTL_MS,
} from "./keycloak-oidc-state.js";
import {
  clearKeycloakSessionCookies,
  clearOidcStateCookie,
  readKeycloakSessionTokens,
  readOidcStateCookie,
  setOidcStateCookie,
  setSessionCookies,
} from "./keycloak-session-cookies.js";

function clearAuthCookies(res: Response, secure: boolean): void {
  clearKeycloakSessionCookies(res, secure);
  clearOidcStateCookie(res, secure);
}

export async function tryAuthenticateKeycloakSession(req: Request, res: Response) {
  const secure = shouldSecureCookies(req);
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
          refresh_token: refreshToken,
        })
      );
      setSessionCookies(res, secure, {
        ...refreshed,
        refresh_token: refreshed.refresh_token || refreshToken,
      });
      return await verifyKeycloakAccessToken(refreshed.access_token!);
    } catch (error) {
      clearKeycloakSessionCookies(res, secure);
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
    clearKeycloakSessionCookies(res, secure);
  }

  return null;
}

export async function handleKeycloakLogin(req: Request, res: Response): Promise<void> {
  const secure = shouldSecureCookies(req);
  const forceLogin = String(req.query.force || "").trim() === "1";
  const returnTo = getSafeReturnPath(req.query.returnTo);
  const existing = await tryAuthenticateKeycloakSession(req, res);
  if (existing && !forceLogin) {
    res.redirect(302, returnTo);
    return;
  }

  if (forceLogin) {
    clearAuthCookies(res, secure);
  }

  const state = crypto.randomUUID();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);
  const redirectUri = `${resolveRequestOrigin(req)}/api/v1/auth/callback`;

  setOidcStateCookie(
    res,
    secure,
    encodeOidcLoginState(
      {
        state,
        codeVerifier,
        redirectUri,
        returnTo,
        createdAt: Date.now(),
      },
      config.oidcStateSecret
    ),
    LOGIN_STATE_TTL_MS
  );

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
  const secure = shouldSecureCookies(req);
  const state = String(req.query.state || "").trim();
  const encodedState = readOidcStateCookie(req);
  clearOidcStateCookie(res, secure);

  const pendingState =
    state && encodedState
      ? decodeOidcLoginState({
          value: encodedState,
          secret: config.oidcStateSecret,
          expectedState: state,
        })
      : null;
  const returnTo = pendingState?.returnTo || "/";

  const oidcError = String(req.query.error || "").trim();
  if (oidcError) {
    clearKeycloakSessionCookies(res, secure);
    const authError = oidcError === "access_denied" ? "access_denied" : "login_failed";
    res.redirect(302, appendAuthError(returnTo, authError));
    return;
  }

  const code = String(req.query.code || "").trim();
  if (!pendingState || !code) {
    clearKeycloakSessionCookies(res, secure);
    res.redirect(302, appendAuthError(returnTo, "login_failed"));
    return;
  }

  try {
    const tokens = await performTokenRequest(
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: pendingState.redirectUri,
        code_verifier: pendingState.codeVerifier,
      })
    );

    await verifyKeycloakAccessToken(tokens.access_token!);
    setSessionCookies(res, secure, tokens);
    res.redirect(302, returnTo);
  } catch (error) {
    clearKeycloakSessionCookies(res, secure);
    const authError =
      error instanceof Error && error.message === "FORBIDDEN"
        ? "forbidden"
        : "login_failed";
    res.redirect(302, appendAuthError(returnTo, authError));
  }
}

export function handleKeycloakLogout(req: Request, res: Response): void {
  const secure = shouldSecureCookies(req);
  clearAuthCookies(res, secure);
  const returnTo = getSafeReturnPath(
    req.method.toUpperCase() === "GET" ? req.query.returnTo : req.body?.returnTo
  );

  if (req.method.toUpperCase() === "GET") {
    res.redirect(302, returnTo || "/login");
    return;
  }

  res.json({ ok: true });
}
