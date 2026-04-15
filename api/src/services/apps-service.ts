import type { HomeAppCard, UserAccessProfile } from "../../../shared/app-types.js";
import { hasAccess } from "./access-evaluator.js";
import { isStale, loadRegistry } from "./registry-store.js";
import { getLatestStatusPerApp } from "./uptime-store.js";

export async function listAppsForUser(user: UserAccessProfile): Promise<HomeAppCard[]> {
  const registry = await loadRegistry();
  const statusMap = getLatestStatusPerApp();
  const now = Date.now();

  return registry
    .filter((entry) => !isStale(entry, now))
    .filter((entry) => hasAccess(entry, user))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      url: entry.url,
      category: entry.category,
      uptimeStatus: statusMap.get(entry.id) ?? "unknown",
    }));
}
