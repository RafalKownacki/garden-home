import type { AppRegistryEntry, UserAccessProfile } from "../../../shared/app-types.js";
import { hasAccess } from "./access-evaluator.js";
import {
  getFreshMembershipRows,
  type AccessSnapshotMembershipRow,
  type AccessSnapshotState,
} from "./access-snapshot-store.js";
import {
  describeAccessSyncHealth,
  getAccessSyncStateMap,
  triggerAccessRefreshInBackground,
  type AccessSyncHealth,
} from "./access-sync-service.js";

type AccessUser = Pick<UserAccessProfile, "userId" | "realmRoles" | "clientRoles">;

export type AppAccessSource = "snapshot" | "legacy";

export type ResolvedAppAccess = {
  hasAccess: boolean;
  source: AppAccessSource;
  syncHealth?: AccessSyncHealth;
};

export type SnapshotAccessContext = {
  now: number;
  syncStateMap: Map<string, AccessSnapshotState>;
  refreshCandidates: Set<string>;
  allAuthenticatedAppIds: Set<string>;
  explicitAppIdsByUser: Map<string, Set<string>>;
};

function isSnapshotEntry(entry: AppRegistryEntry): boolean {
  return entry.accessSync?.mode === "pull_snapshot_v1";
}

function addMapValue(map: Map<string, Set<string>>, key: string, value: string): void {
  const current = map.get(key);
  if (current) {
    current.add(value);
    return;
  }
  map.set(key, new Set([value]));
}

export function createSnapshotAccessContext(params: {
  entries: AppRegistryEntry[];
  userSubs: string[];
  now?: number;
  syncStateMap?: Map<string, AccessSnapshotState>;
  membershipRows?: AccessSnapshotMembershipRow[];
}): SnapshotAccessContext {
  const now = params.now ?? Date.now();
  const snapshotEntries = params.entries.filter(isSnapshotEntry);
  const syncStateMap =
    params.syncStateMap ??
    (snapshotEntries.length > 0 ? getAccessSyncStateMap() : new Map<string, AccessSnapshotState>());
  const refreshCandidates = new Set<string>();
  const allAuthenticatedAppIds = new Set<string>();
  const explicitFreshAppIds: string[] = [];

  for (const entry of snapshotEntries) {
    const snapshotState = syncStateMap.get(entry.id);
    const syncHealth = describeAccessSyncHealth(entry, snapshotState, now);
    if (syncHealth !== "fresh") {
      refreshCandidates.add(entry.id);
      continue;
    }

    if (snapshotState?.subject_mode === "all_authenticated") {
      allAuthenticatedAppIds.add(entry.id);
      continue;
    }

    explicitFreshAppIds.push(entry.id);
  }

  const membershipRows =
    params.membershipRows ??
    getFreshMembershipRows(explicitFreshAppIds, params.userSubs, now);
  const explicitAppIdsByUser = new Map<string, Set<string>>();

  for (const row of membershipRows) {
    addMapValue(explicitAppIdsByUser, row.user_sub, row.app_id);
  }

  return {
    now,
    syncStateMap,
    refreshCandidates,
    allAuthenticatedAppIds,
    explicitAppIdsByUser,
  };
}

export function triggerPendingSnapshotRefreshes(context: SnapshotAccessContext): void {
  for (const appId of context.refreshCandidates) {
    triggerAccessRefreshInBackground(appId);
  }
}

export function resolveAppAccessForUser(
  entry: AppRegistryEntry,
  user: AccessUser,
  context: SnapshotAccessContext
): ResolvedAppAccess {
  if (!isSnapshotEntry(entry)) {
    return {
      hasAccess: hasAccess(entry, user as UserAccessProfile),
      source: "legacy",
    };
  }

  if (context.allAuthenticatedAppIds.has(entry.id)) {
    return {
      hasAccess: true,
      source: "snapshot",
      syncHealth: "fresh",
    };
  }

  return {
    hasAccess: context.explicitAppIdsByUser.get(user.userId)?.has(entry.id) ?? false,
    source: "snapshot",
    syncHealth: describeAccessSyncHealth(
      entry,
      context.syncStateMap.get(entry.id),
      context.now
    ),
  };
}
