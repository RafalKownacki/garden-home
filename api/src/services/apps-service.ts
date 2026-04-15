import type { HomeAppCard, UserAccessProfile } from "../../../shared/app-types.js";
import {
  createSnapshotAccessContext,
  resolveAppAccessForUser,
  triggerPendingSnapshotRefreshes,
} from "./access-resolver.js";
import { isStale, loadRegistry } from "./registry-store.js";
import { getLatestStatusPerApp } from "./uptime-store.js";

export async function listAppsForUser(user: UserAccessProfile): Promise<HomeAppCard[]> {
  const registry = await loadRegistry();
  const statusMap = getLatestStatusPerApp();
  const now = Date.now();
  const context = createSnapshotAccessContext({
    entries: registry,
    userSubs: [user.userId],
    now,
  });
  triggerPendingSnapshotRefreshes(context);

  return registry
    .filter((entry) => !isStale(entry, now))
    .filter((entry) => entry.enabled && entry.visibleInHome && entry.environment === "prod")
    .filter((entry) => resolveAppAccessForUser(entry, user, context).hasAccess)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      url: entry.url,
      category: entry.category,
      uptimeStatus: statusMap.get(entry.id) ?? "unknown",
    }));
}
