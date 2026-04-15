import type { Express, Request, Response } from "express";
import type { AppAccessRule, AppRegistryEntry } from "../../../shared/app-types.js";
import { verifyRegistrationKey } from "../auth/verify-registration-key.js";
import * as store from "../services/registry-store.js";

const ID_RE = /^[a-z0-9][a-z0-9-]{1,63}$/;

type ValidationResult =
  | { ok: true; entry: AppRegistryEntry }
  | { ok: false; error: string; field?: string };

function validateAccessRule(rule: unknown): rule is AppAccessRule {
  if (!rule || typeof rule !== "object") return false;
  const r = rule as Record<string, unknown>;
  if (r.source === "authenticated") return true;
  if (r.source === "realm") {
    return Array.isArray(r.anyRoles) && r.anyRoles.every((x) => typeof x === "string");
  }
  if (r.source === "client") {
    return (
      typeof r.clientId === "string" &&
      r.clientId.length > 0 &&
      Array.isArray(r.anyRoles) &&
      r.anyRoles.every((x) => typeof x === "string")
    );
  }
  return false;
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
  if (b.sourcePath !== undefined && typeof b.sourcePath !== "string") {
    return { ok: false, error: "INVALID_SOURCE_PATH", field: "sourcePath" };
  }
  if (!Array.isArray(b.access) || b.access.length === 0) {
    return { ok: false, error: "INVALID_ACCESS", field: "access" };
  }
  if (!b.access.every(validateAccessRule)) {
    return { ok: false, error: "INVALID_ACCESS_RULE", field: "access" };
  }

  const entry: AppRegistryEntry = {
    id: b.id,
    name: b.name.trim(),
    description: b.description,
    url: b.url,
    environment: "prod",
    category: b.category as string | undefined,
    sourcePath: b.sourcePath as string | undefined,
    enabled: true,
    visibleInHome: true,
    access: b.access as AppAccessRule[],
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
    res.status(created ? 201 : 200).json({
      created,
      id: result.entry.id,
      lastRegisteredAt: result.entry.lastRegisteredAt,
    });
  });
}
