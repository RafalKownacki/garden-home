import type {
  AppAccessRule,
  AppAccessSyncConfig,
  AppRegistrationRecord,
} from "../../../shared/app-types.js";

const ID_RE = /^[a-z0-9][a-z0-9-]{1,63}$/;

export type RegistrationValidationResult =
  | { ok: true; entry: AppRegistrationRecord }
  | { ok: false; error: string; field?: string };

export function isAccessRule(rule: unknown): rule is AppAccessRule {
  if (!rule || typeof rule !== "object") return false;
  const r = rule as Record<string, unknown>;
  if (r.source === "authenticated") return true;
  if (r.source === "realm") {
    return Array.isArray(r.anyRoles) && r.anyRoles.every((item) => typeof item === "string");
  }
  if (r.source === "client") {
    return (
      typeof r.clientId === "string" &&
      r.clientId.length > 0 &&
      Array.isArray(r.anyRoles) &&
      r.anyRoles.every((item) => typeof item === "string")
    );
  }
  return false;
}

export function isAccessSyncConfig(value: unknown): value is AppAccessSyncConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Record<string, unknown>;
  return config.mode === "pull_snapshot_v1" && typeof config.url === "string" && /^https:\/\//.test(config.url);
}

export function normalizeStoredRegistrationRecord(input: unknown): AppRegistrationRecord | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;

  if (
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    typeof row.description !== "string" ||
    typeof row.url !== "string" ||
    row.environment !== "prod"
  ) {
    return null;
  }

  return {
    id: row.id,
    name: row.name.trim(),
    description: row.description,
    url: row.url,
    environment: "prod",
    category: typeof row.category === "string" ? row.category : undefined,
    access: Array.isArray(row.access) ? row.access.filter(isAccessRule) : undefined,
    accessSync: isAccessSyncConfig(row.accessSync) ? row.accessSync : undefined,
    lastRegisteredAt: typeof row.lastRegisteredAt === "string" ? row.lastRegisteredAt : undefined,
  };
}

export function validateRegistrationBody(body: unknown): RegistrationValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "INVALID_BODY" };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.id !== "string" || !ID_RE.test(b.id)) {
    return { ok: false, error: "INVALID_ID", field: "id" };
  }
  if (typeof b.name !== "string" || !b.name.trim()) {
    return { ok: false, error: "INVALID_NAME", field: "name" };
  }
  if (typeof b.description !== "string") {
    return { ok: false, error: "INVALID_DESCRIPTION", field: "description" };
  }
  if (typeof b.url !== "string" || !/^https:\/\//.test(b.url)) {
    return { ok: false, error: "INVALID_URL", field: "url" };
  }
  if (b.environment !== "prod") {
    return { ok: false, error: "INVALID_ENVIRONMENT", field: "environment" };
  }
  if (b.category !== undefined && typeof b.category !== "string") {
    return { ok: false, error: "INVALID_CATEGORY", field: "category" };
  }

  const access = Array.isArray(b.access) ? b.access : undefined;
  if (access && !access.every(isAccessRule)) {
    return { ok: false, error: "INVALID_ACCESS_RULE", field: "access" };
  }

  const accessSync = b.accessSync;
  if (accessSync !== undefined && !isAccessSyncConfig(accessSync)) {
    return { ok: false, error: "INVALID_ACCESS_SYNC", field: "accessSync" };
  }

  if ((!access || access.length === 0) && accessSync === undefined) {
    return { ok: false, error: "ACCESS_CONFIGURATION_REQUIRED", field: "accessSync" };
  }

  return {
    ok: true,
    entry: {
      id: b.id,
      name: b.name.trim(),
      description: b.description,
      url: b.url,
      environment: "prod",
      category: b.category as string | undefined,
      access,
      accessSync: accessSync as AppAccessSyncConfig | undefined,
      lastRegisteredAt: new Date().toISOString(),
    },
  };
}
