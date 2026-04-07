export const appConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Home",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://192.168.14.55:19010",
  keycloakEnabled: process.env.NEXT_PUBLIC_KEYCLOAK_ENABLED !== "false",
  keycloakUrl: process.env.NEXT_PUBLIC_KEYCLOAK_URL || "https://auth.grdn.pl",
  keycloakRealm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "garden",
  keycloakClientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "garden-home-app"
};
