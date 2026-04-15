import type { AppRegistryEntry } from "../../../shared/app-types.js";
import { hasAccess } from "./access-evaluator.js";
import { listUsersWithAccessToApp } from "./access-snapshot-store.js";
import { listUsersWithRoles, type KcUserWithRoles } from "./keycloak-admin.js";

export type AppAccessSource = "snapshot" | "legacy";

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
  const userById = new Map(allUsers.map((user) => [user.userId, user]));

  if (entry.accessSync?.mode === "pull_snapshot_v1") {
    const subs = listUsersWithAccessToApp(entry.id, Date.now());
    const users = subs
      .map((sub) => userById.get(sub))
      .filter((user): user is KcUserWithRoles => Boolean(user))
      .map((user) => toEntry(user, "snapshot"));
    return { source: "snapshot", users };
  }

  const users = allUsers
    .filter((user) => hasAccess(entry, user))
    .map((user) => toEntry(user, "legacy"));
  return { source: "legacy", users };
}
