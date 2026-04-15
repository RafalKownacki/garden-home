import type { Express, Request, Response } from "express";
import type {
  AppAccessRule,
  AppAccessSyncConfig,
  AppRegistrationRecord,
} from "../../../shared/app-types.js";
import { verifyRegistrationKey } from "../auth/verify-registration-key.js";
import { triggerAccessRefreshInBackground } from "../services/access-sync-service.js";
import * as store from "../services/registry-store.js";

const ID_RE = /^[a-z0-9][a-z0-9-]{1,63}$/;

type ValidationResult =
  | { ok: true; entry: AppRegistrationRecord }
  | { ok: false; error: string; field?: string };

function validateAccessRule(rule: unknown): rule is AppAccessRule {
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

function validateAccessSync(value: unknown): value is AppAccessSyncConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Record<string, unknown>;
  return config.mode === "pull_snapshot_v1" && typeof config.url === "string" && /^https:\/\//.test(config.url);
}

function validateBody(body: unknown): ValidationResult {
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
  if (access && !access.every(validateAccessRule)) {
    return { ok: false, error: "INVALID_ACCESS_RULE", field: "access" };
  }

  const accessSync = b.accessSync;
  if (accessSync !== undefined && !validateAccessSync(accessSync)) {
    return { ok: false, error: "INVALID_ACCESS_SYNC", field: "accessSync" };
  }

  if ((!access || access.length === 0) && accessSync === undefined) {
    return { ok: false, error: "ACCESS_CONFIGURATION_REQUIRED", field: "accessSync" };
  }

  const entry: AppRegistrationRecord = {
    id: b.id,
    name: b.name.trim(),
    description: b.description,
    url: b.url,
    environment: "prod",
    category: b.category as string | undefined,
    access: access as AppAccessRule[] | undefined,
    accessSync: accessSync as AppAccessSyncConfig | undefined,
    lastRegisteredAt: new Date().toISOString(),
  };
  return { ok: true, entry };
}

export function registerRegistrationRoutes(app: Express): void {
  app.post("/v1/registry/register", verifyRegistrationKey, async (req: Request, res: Response) => {
    const result = validateBody(req.body);
    if (!result.ok) {
      res.status(400).json({ error: result.error, field: result.field });
      return;
    }

    const { created } = await store.upsert(result.entry);
    if (result.entry.accessSync?.mode === "pull_snapshot_v1") {
      triggerAccessRefreshInBackground(result.entry.id);
    }

    res.status(created ? 201 : 200).json({
      created,
      id: result.entry.id,
      lastRegisteredAt: result.entry.lastRegisteredAt,
    });
  });
}
