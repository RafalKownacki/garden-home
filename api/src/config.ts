import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.resolve(rootDir, "../.env") });
dotenv.config();

function env(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw ? Number(raw) : fallback;
  return Number.isFinite(value) ? value : fallback;
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const config = {
  rootDir,
  port: envNumber("PORT", 18010),
  corsOrigin: env("CORS_ORIGIN", "http://192.168.14.55:18000"),
  keycloakIssuer: env("KEYCLOAK_ISSUER_URL", "https://auth.grdn.pl/realms/garden"),
  keycloakJwksUrl: env(
    "KEYCLOAK_JWKS_URL",
    "https://auth.grdn.pl/realms/garden/protocol/openid-connect/certs"
  ),
  keycloakAudience: env("KEYCLOAK_AUDIENCE", "garden-home-app"),
  authPublicPaths: splitCsv(env("AUTH_PUBLIC_PATHS", "GET /health"))
};
