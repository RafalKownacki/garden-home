export type PrincipalType = "human" | "service";

export const SERVICE_ACCOUNT_ROLE_TOKEN = "grdn-service-account";

const LEGACY_SERVICE_ACCOUNT_ROLE_TOKENS = ["principal:service"];
const SERVICE_ACCOUNT_PATTERNS = [
  /^service-account-/,
  /mcp$/,
  /-smoke/,
  /^srsmoke$/,
  /-diag$/,
  /-sync$/,
  /^rbac\./,
  /-test$/,
  /^szr_.*_test$/,
];

export function isServiceAccountUsername(username: string): boolean {
  return SERVICE_ACCOUNT_PATTERNS.some((pattern) => pattern.test(username));
}

function normalizePrincipalType(value: unknown): PrincipalType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "service") return "service";
  if (normalized === "human") return "human";
  return null;
}

export function resolvePrincipalType(input: {
  principalType?: unknown | undefined;
  alternatePrincipalType?: unknown | undefined;
  realmRoles?: string[] | null | undefined;
  username?: string | null | undefined;
}): PrincipalType {
  const explicit =
    normalizePrincipalType(input.principalType)
    ?? normalizePrincipalType(input.alternatePrincipalType);
  if (explicit) return explicit;

  const realmRoles = Array.isArray(input.realmRoles) ? input.realmRoles : [];
  if (realmRoles.includes(SERVICE_ACCOUNT_ROLE_TOKEN)) return "service";
  if (LEGACY_SERVICE_ACCOUNT_ROLE_TOKENS.some((role) => realmRoles.includes(role))) return "service";

  const username = input.username ?? null;
  if (username && isServiceAccountUsername(username)) return "service";
  return "human";
}
