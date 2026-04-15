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
