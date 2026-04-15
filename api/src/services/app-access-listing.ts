import type { AppRegistryEntry } from "../../../shared/app-types.js";
import { listUsersWithRoles, type KcUserWithRoles } from "./keycloak-admin.js";
import {
  createSnapshotAccessContext,
  resolveAppAccessForUser,
  triggerPendingSnapshotRefreshes,
  type AppAccessSource,
} from "./access-resolver.js";

export type AppAccessEntry = {
  userId: string;
  username: string;
  displayName: string | null;
  email: string | null;
  source: AppAccessSource;
};

function toEntry(user: KcUserWithRoles, source: AppAccessSource): AppAccessEntry {
  return {
    userId: user.userId,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    source,
  };
}

export async function listUsersWithAppAccess(
  entry: AppRegistryEntry
): Promise<{ source: AppAccessSource; users: AppAccessEntry[] }> {
  const allUsers = await listUsersWithRoles();
  const context = createSnapshotAccessContext({
    entries: [entry],
    userSubs: allUsers.map((user) => user.userId),
  });
  triggerPendingSnapshotRefreshes(context);

  const users = allUsers
    .filter((user) => resolveAppAccessForUser(entry, user, context).hasAccess)
    .map((user) =>
      toEntry(user, entry.accessSync?.mode === "pull_snapshot_v1" ? "snapshot" : "legacy")
    );
  const source: AppAccessSource = entry.accessSync?.mode === "pull_snapshot_v1" ? "snapshot" : "legacy";
  return { source, users };
}
