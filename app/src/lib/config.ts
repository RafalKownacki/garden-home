function resolveApiBase(raw?: string): string {
  const browser = typeof window !== "undefined" ? window : undefined;
  const fallback = "/api";
  if (!raw || !raw.trim()) return fallback;

  try {
    const url = new URL(raw);
    if (browser && url.hostname === browser.location.hostname) {
      const path = (url.pathname || "/").replace(/\/$/, "");
      if (!path || path === "/" || path === "/api") return fallback;
      if (path.startsWith("/api/")) return path;
    }
    if (!url.pathname || url.pathname === "/") {
      return url.origin;
    }
    return url.toString();
  } catch {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }
}

export const appConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Home",
  apiBaseUrl: resolveApiBase(process.env.NEXT_PUBLIC_API_BASE_URL || "/api"),
  keycloakEnabled: process.env.NEXT_PUBLIC_KEYCLOAK_ENABLED !== "false",
  keycloakUrl: process.env.NEXT_PUBLIC_KEYCLOAK_URL || "https://auth.grdn.pl",
  keycloakRealm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "garden",
  keycloakClientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "garden-home-app"
};
