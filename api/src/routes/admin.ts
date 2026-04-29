import type { Express, Request, Response } from "express";
import {
  createSnapshotAccessContext,
  resolveAppAccessForUser,
  triggerPendingSnapshotRefreshes,
} from "../services/access-resolver.js";
import {
  describeAccessSyncHealth,
  getAccessSyncState,
  refreshAccessSnapshotForAppId,
} from "../services/access-sync-service.js";
import { listUsersWithRoles } from "../services/keycloak-admin.js";
import { setNetworkVisibilityMode } from "../services/network-visibility-store.js";
import * as store from "../services/registry-store.js";
import type { AppNetworkVisibilityMode } from "../../../shared/app-types.js";

const NETWORK_VISIBILITY_MODES: AppNetworkVisibilityMode[] = [
  "unknown",
  "whitelist-lan",
  "lan",
  "internet",
];

function isNetworkVisibilityMode(value: unknown): value is AppNetworkVisibilityMode {
  return typeof value === "string" && (NETWORK_VISIBILITY_MODES as string[]).includes(value);
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
      const accessContext = createSnapshotAccessContext({
        entries: visibleApps,
        userSubs: allUsers.map((user) => user.userId),
        now,
      });
      const syncStateMap = accessContext.syncStateMap;
      triggerPendingSnapshotRefreshes(accessContext);

      const rows = allUsers.map((user) => {
        const service = user.principalType === "service";
        return {
          userId: user.userId,
          username: user.username,
          displayName: user.displayName,
          isAdmin: user.realmRoles.includes("admin"),
          isService: service,
          access: Object.fromEntries(
            visibleApps.map((entry) => [
              entry.id,
              resolveAppAccessForUser(entry, user, accessContext).hasAccess,
            ])
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
            category: entry.category ?? null,
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

  app.put("/v1/admin/registry/:id/network-visibility", async (req, res) => {
    if (!requireAdmin(req, res)) return;

    const entry = await store.getById(req.params.id);
    if (!entry) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    const mode = (req.body as { mode?: unknown } | undefined)?.mode;
    if (!isNetworkVisibilityMode(mode)) {
      res.status(400).json({ error: "INVALID_MODE" });
      return;
    }

    setNetworkVisibilityMode(entry.id, mode, req.userProfile?.userId ?? null);
    res.json({ appId: entry.id, mode });
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
