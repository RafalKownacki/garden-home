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

export function buildBrowserProxyUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/api${normalizedPath}`;
}

function currentReturnTo(): string {
  if (typeof window === "undefined") return "/";
  const url = new URL(window.location.href);
  url.searchParams.delete("authError");
  const value = `${url.pathname}${url.search}`;
  if (value.startsWith("/api/")) return "/";
  return value || "/";
}

export function buildBackendLoginUrl(forcePrompt = false): string {
  const params = new URLSearchParams({
    returnTo: currentReturnTo()
  });
  if (forcePrompt) {
    params.set("force", "1");
  }
  return `${buildBrowserProxyUrl("/v1/auth/login")}?${params.toString()}`;
}

export function buildBackendLogoutUrl(): string {
  const params = new URLSearchParams({
    returnTo: "/login"
  });
  return `${buildBrowserProxyUrl("/v1/auth/logout")}?${params.toString()}`;
}
