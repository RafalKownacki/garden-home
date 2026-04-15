import type { HomeAppCard, UserAccessProfile } from "../../../shared/app-types.js";
import { hasAccess } from "./access-evaluator.js";
import { listAccessibleAppIdsForUser } from "./access-snapshot-store.js";
import {
  describeAccessSyncHealth,
  getAccessSyncStateMap,
  triggerAccessRefreshInBackground,
} from "./access-sync-service.js";
import { isStale, loadRegistry } from "./registry-store.js";
import { getLatestStatusPerApp } from "./uptime-store.js";

export async function listAppsForUser(user: UserAccessProfile): Promise<HomeAppCard[]> {
  const registry = await loadRegistry();
  const statusMap = getLatestStatusPerApp();
  const syncStateMap = getAccessSyncStateMap();
  const now = Date.now();
  const accessFromSnapshots = new Set(listAccessibleAppIdsForUser(user.userId, now));

  return registry
    .filter((entry) => !isStale(entry, now))
    .filter((entry) => entry.enabled && entry.visibleInHome && entry.environment === "prod")
    .filter((entry) => {
      const syncState = syncStateMap.get(entry.id);
      const syncHealth = describeAccessSyncHealth(entry, syncState, now);

      if (entry.accessSync?.mode === "pull_snapshot_v1") {
        if (syncHealth !== "fresh") {
          triggerAccessRefreshInBackground(entry.id);
        }
        return accessFromSnapshots.has(entry.id);
      }

      return hasAccess(entry, user);
    })
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      url: entry.url,
      category: entry.category,
      uptimeStatus: statusMap.get(entry.id) ?? "unknown",
    }));
}
