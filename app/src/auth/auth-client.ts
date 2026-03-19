"use client";

import Keycloak from "keycloak-js";
import { appConfig } from "../lib/config";

let keycloakInstance: Keycloak | null = null;

export function getKeycloak() {
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak({
      url: appConfig.keycloakUrl,
      realm: appConfig.keycloakRealm,
      clientId: appConfig.keycloakClientId
    });
  }

  return keycloakInstance;
}

export function isSecureBrowserContext(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return true;
  return window.isSecureContext;
}

export function randomState(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function buildAuthorizeUrl(forcePrompt = false): string {
  const state = randomState();
  sessionStorage.setItem("garden_home_oidc_state", state);
  const params = new URLSearchParams({
    client_id: appConfig.keycloakClientId,
    redirect_uri: `${window.location.origin}/`,
    response_type: "token",
    response_mode: "fragment",
    scope: "openid profile email",
    state
  });

  if (forcePrompt) {
    params.set("prompt", "login");
    params.set("max_age", "0");
  }

  return `${appConfig.keycloakUrl}/realms/${encodeURIComponent(appConfig.keycloakRealm)}/protocol/openid-connect/auth?${params.toString()}`;
}

export function buildLogoutUrl(): string {
  const params = new URLSearchParams({
    client_id: appConfig.keycloakClientId,
    post_logout_redirect_uri: `${window.location.origin}/login`
  });

  return `${appConfig.keycloakUrl}/realms/${encodeURIComponent(appConfig.keycloakRealm)}/protocol/openid-connect/logout?${params.toString()}`;
}

export function tryHandleImplicitCallback(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const token = params.get("access_token");
  const state = params.get("state");
  const expectedState = sessionStorage.getItem("garden_home_oidc_state");
  if (!token || !state || !expectedState || state !== expectedState) {
    return null;
  }

  sessionStorage.removeItem("garden_home_oidc_state");
  window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}${window.location.search}`);
  return token;
}
