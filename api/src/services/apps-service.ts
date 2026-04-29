import type {
  AppNetworkVisibilityMode,
  HomeAppCard,
  UserAccessProfile,
} from "../../../shared/app-types.js";
import {
  createSnapshotAccessContext,
  resolveAppAccessForUser,
  triggerPendingSnapshotRefreshes,
} from "./access-resolver.js";
import { listNetworkVisibilityModes } from "./network-visibility-store.js";
import { loadRegistry } from "./registry-store.js";
import { getLatestStatusPerApp } from "./uptime-store.js";

export function selectAppsForUser(params: {
  registry: import("../../../shared/app-types.js").AppRegistryEntry[];
  statusMap: Map<string, HomeAppCard["uptimeStatus"]>;
  visibilityMap: Map<string, AppNetworkVisibilityMode>;
  user: UserAccessProfile;
  now?: number;
}): HomeAppCard[] {
  const now = params.now ?? Date.now();
  const context = createSnapshotAccessContext({
    entries: params.registry,
    userSubs: [params.user.userId],
    now,
  });
  triggerPendingSnapshotRefreshes(context);

  return params.registry
    .filter((entry) => entry.enabled && entry.visibleInHome && entry.environment === "prod")
    .filter((entry) => resolveAppAccessForUser(entry, params.user, context).hasAccess)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      url: entry.url,
      category: entry.category,
      uptimeStatus: params.statusMap.get(entry.id) ?? "unknown",
      networkVisibility: params.visibilityMap.get(entry.id) ?? "unknown",
    }));
}

export async function listAppsForUser(user: UserAccessProfile): Promise<HomeAppCard[]> {
  const registry = await loadRegistry();
  const statusMap = getLatestStatusPerApp();
  const visibilityMap = listNetworkVisibilityModes();
  return selectAppsForUser({ registry, statusMap, visibilityMap, user });
}
