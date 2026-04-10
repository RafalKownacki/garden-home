import type { Express, Request, Response } from "express";
import type { AppRegistryEntry } from "../../../shared/app-types.js";
import { hasAccess } from "../services/access-evaluator.js";
import { listUsersWithRoles } from "../services/keycloak-admin.js";
import * as store from "../services/registry-store.js";

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

function isServiceAccount(username: string): boolean {
  return SERVICE_ACCOUNT_PATTERNS.some((p) => p.test(username));
}

function requireAdmin(req: Request, res: Response): boolean {
  if (!req.userProfile?.realmRoles.includes("admin")) {
    res.status(403).json({ error: "FORBIDDEN" });
    return false;
  }
  return true;
}

export function registerAdminRoutes(app: Express) {
  // ── Access matrix ──────────────────────────────────────────
  app.get("/v1/admin/matrix", async (req, res) => {
    console.log("[matrix] request from:", req.headers.origin, "| user:", req.userProfile?.username, "| roles:", req.userProfile?.realmRoles?.slice(0, 5));
    if (!requireAdmin(req, res)) return;

    const includeService = req.query.includeService === "1";

    try {
      const registry = await store.getAll();
      const visibleApps = registry.filter(
        (a) => a.enabled && a.visibleInHome && a.environment === "prod"
      );

      const allUsers = await listUsersWithRoles();

      const rows = allUsers.map((user) => {
        const service = isServiceAccount(user.username);
        return {
          userId: user.userId,
          username: user.username,
          displayName: user.displayName,
          isAdmin: user.realmRoles.includes("admin"),
          isService: service,
          access: Object.fromEntries(
            visibleApps.map((a) => [a.id, hasAccess(a, user)])
          )
        };
      });

      const filteredRows = includeService ? rows : rows.filter((r) => !r.isService);

      res.json({
        apps: visibleApps.map((a) => ({ id: a.id, name: a.name })),
        rows: filteredRows,
        totalUsers: allUsers.length,
        hiddenServiceAccounts: rows.filter((r) => r.isService).length,
      });
    } catch (err) {
      console.error("matrix error:", err);
      res.status(500).json({ error: "MATRIX_FAILED" });
    }
  });

  // ── Registry CRUD ──────────────────────────────────────────
  app.get("/v1/admin/registry", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const all = await store.getAll();
    res.json({ count: all.length, entries: all });
  });

  app.get("/v1/admin/registry/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const entry = await store.getById(req.params.id);
    if (!entry) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json(entry);
  });

  app.put("/v1/admin/registry/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const body = req.body as Partial<AppRegistryEntry>;
    if (!body.name || !body.url) {
      res.status(400).json({ error: "MISSING_FIELDS", required: ["name", "url"] });
      return;
    }
    const entry: AppRegistryEntry = {
      id: req.params.id,
      name: body.name,
      description: body.description ?? "",
      url: body.url,
      environment: "prod",
      category: body.category,
      sourcePath: body.sourcePath,
      enabled: body.enabled ?? true,
      visibleInHome: body.visibleInHome ?? true,
      access: body.access ?? [{ source: "realm", anyRoles: ["admin"] }],
    };
    const { created } = await store.upsert(entry);
    res.status(created ? 201 : 200).json(entry);
  });

  app.delete("/v1/admin/registry/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const removed = await store.remove(req.params.id);
    if (!removed) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.status(204).end();
  });
}
