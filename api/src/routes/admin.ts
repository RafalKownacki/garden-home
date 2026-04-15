import type { Express, Request, Response } from "express";
import { hasAccess } from "../services/access-evaluator.js";
import { getFreshMembershipRows } from "../services/access-snapshot-store.js";
import {
  describeAccessSyncHealth,
  getAccessSyncState,
  getAccessSyncStateMap,
  refreshAccessSnapshotForAppId,
  triggerAccessRefreshInBackground,
} from "../services/access-sync-service.js";
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
  return SERVICE_ACCOUNT_PATTERNS.some((pattern) => pattern.test(username));
}

function requireAdmin(req: Request, res: Response): boolean {
  if (!req.userProfile?.realmRoles.includes("admin")) {
    res.status(403).json({ error: "FORBIDDEN" });
    return false;
  }
  return true;
}

export function registerAdminRoutes(app: Express) {
  app.get("/v1/admin/matrix", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const includeService = req.query.includeService === "1";

    try {
      const registry = await store.getAll();
      const now = Date.now();
      const visibleApps = registry.filter(
        (entry) =>
          entry.enabled && entry.visibleInHome && entry.environment === "prod"
      );
      const allUsers = await listUsersWithRoles();
      const syncStateMap = getAccessSyncStateMap();

      const snapshotApps = visibleApps.filter((entry) => entry.accessSync?.mode === "pull_snapshot_v1");
      const membershipRows = getFreshMembershipRows(
        snapshotApps.map((entry) => entry.id),
        allUsers.map((user) => user.userId),
        now
      );
      const membership = new Set(membershipRows.map((row) => `${row.app_id}::${row.user_sub}`));

      for (const appEntry of snapshotApps) {
        const syncHealth = describeAccessSyncHealth(appEntry, syncStateMap.get(appEntry.id), now);
        if (syncHealth !== "fresh") {
          triggerAccessRefreshInBackground(appEntry.id);
        }
      }

      const rows = allUsers.map((user) => {
        const service = isServiceAccount(user.username);
        return {
          userId: user.userId,
          username: user.username,
          displayName: user.displayName,
          isAdmin: user.realmRoles.includes("admin"),
          isService: service,
          access: Object.fromEntries(
            visibleApps.map((entry) => {
              if (entry.accessSync?.mode === "pull_snapshot_v1") {
                return [entry.id, membership.has(`${entry.id}::${user.userId}`)];
              }
              return [entry.id, hasAccess(entry, user)];
            })
          ),
        };
      });

      const filteredRows = includeService ? rows : rows.filter((row) => !row.isService);

      res.json({
        apps: visibleApps.map((entry) => {
          const syncState = syncStateMap.get(entry.id);
          return {
            id: entry.id,
            name: entry.name,
            lastRegisteredAt: entry.lastRegisteredAt ?? null,
            isStale: store.isStale(entry, now),
            accessSyncStatus: describeAccessSyncHealth(entry, syncState, now),
            accessSyncFetchedAt: syncState?.fetched_at ?? null,
            accessSyncGeneratedAt: syncState?.generated_at ?? null,
            accessSyncUserCount: syncState?.user_count ?? null,
            accessSyncError: syncState?.error ?? null,
          };
        }),
        rows: filteredRows,
        totalUsers: allUsers.length,
        hiddenServiceAccounts: rows.filter((row) => row.isService).length,
      });
    } catch (error) {
      console.error("matrix error:", error);
      res.status(500).json({ error: "MATRIX_FAILED" });
    }
  });

  app.get("/v1/admin/registry", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const all = await store.getAll();
    res.json({ count: all.length, entries: all });
  });

  app.get("/v1/admin/registry/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const entry = await store.getById(req.params.id);
    if (!entry) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    const now = Date.now();
    const syncState = getAccessSyncState(entry.id);
    res.json({
      ...entry,
      accessSyncStatus: describeAccessSyncHealth(entry, syncState, now),
      accessSyncFetchedAt: syncState?.fetched_at ?? null,
      accessSyncGeneratedAt: syncState?.generated_at ?? null,
      accessSyncUserCount: syncState?.user_count ?? null,
      accessSyncError: syncState?.error ?? null,
    });
  });

  app.post("/v1/admin/registry/:id/access-sync", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const entry = await store.getById(req.params.id);
    if (!entry) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    const result = await refreshAccessSnapshotForAppId(entry.id);
    const syncState = getAccessSyncState(entry.id);

    res.json({
      appId: entry.id,
      result,
      accessSyncStatus: describeAccessSyncHealth(entry, syncState, Date.now()),
      accessSyncFetchedAt: syncState?.fetched_at ?? null,
      accessSyncGeneratedAt: syncState?.generated_at ?? null,
      accessSyncUserCount: syncState?.user_count ?? null,
      accessSyncError: syncState?.error ?? null,
    });
  });

  const readOnlyHandler = (_req: Request, res: Response): void => {
    res
      .status(405)
      .setHeader("Allow", "GET, POST")
      .json({
        error: "REGISTRY_READ_ONLY",
        message:
          "Registry is read-only. Apps declare themselves via POST /v1/registry/register and admins can only trigger access-sync refreshes.",
      });
  };
  app.put("/v1/admin/registry/:id", readOnlyHandler);
  app.delete("/v1/admin/registry/:id", readOnlyHandler);
}
