import type { Express, Request, Response } from "express";
import * as registryModule from "../../../shared/app-registry.js";
import type { AppRegistryEntry } from "../../../shared/app-types.js";
import { hasAccess } from "../services/access-evaluator.js";
import { listUsersWithRoles } from "../services/keycloak-admin.js";

const appRegistry: AppRegistryEntry[] =
  "appRegistry" in registryModule && Array.isArray(registryModule.appRegistry)
    ? registryModule.appRegistry
    : "default" in registryModule &&
        registryModule.default &&
        typeof registryModule.default === "object" &&
        "appRegistry" in registryModule.default &&
        Array.isArray((registryModule.default as Record<string, unknown>).appRegistry)
      ? (registryModule.default as { appRegistry: AppRegistryEntry[] }).appRegistry
      : [];

function requireAdmin(req: Request, res: Response): boolean {
  if (!req.userProfile?.realmRoles.includes("admin")) {
    res.status(403).json({ error: "FORBIDDEN" });
    return false;
  }
  return true;
}

export function registerAdminRoutes(app: Express) {
  app.get("/v1/admin/matrix", async (req, res) => {
    console.log("[matrix] request from:", req.headers.origin, "| user:", req.userProfile?.username, "| roles:", req.userProfile?.realmRoles?.slice(0,5));
    if (!requireAdmin(req, res)) {
      console.log("[matrix] FORBIDDEN for:", req.userProfile?.username);
      return;
    }

    try {
      const visibleApps = appRegistry.filter(
        (a) => a.enabled && a.visibleInHome && a.environment === "prod"
      );

      const users = await listUsersWithRoles();

      const rows = users.map((user) => ({
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        isAdmin: user.realmRoles.includes("admin"),
        access: Object.fromEntries(
          visibleApps.map((app) => [app.id, hasAccess(app, user)])
        )
      }));

      res.json({
        apps: visibleApps.map((a) => ({ id: a.id, name: a.name })),
        rows
      });
    } catch (err) {
      console.error("matrix error:", err);
      res.status(500).json({ error: "MATRIX_FAILED" });
    }
  });
}
