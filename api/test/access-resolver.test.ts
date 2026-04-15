import test from "node:test";
import assert from "node:assert/strict";
import type { AppRegistryEntry, UserAccessProfile } from "../../shared/app-types.js";
import {
  createSnapshotAccessContext,
  resolveAppAccessForUser,
} from "../src/services/access-resolver.js";
import type { AccessSnapshotState } from "../src/services/access-snapshot-store.js";

function createSnapshotApp(
  id: string,
  subjectMode: AccessSnapshotState["subject_mode"]
): AppRegistryEntry {
  return {
    id,
    name: id,
    description: id,
    url: `https://${id}.grdn.pl`,
    environment: "prod",
    enabled: true,
    visibleInHome: true,
    accessSync: {
      mode: "pull_snapshot_v1",
      url: `https://${id}-api.grdn.pl/v1/access-snapshot`,
    },
    access: subjectMode === "all_authenticated" ? undefined : [],
  };
}

function createLegacyApp(): AppRegistryEntry {
  return {
    id: "legacy",
    name: "legacy",
    description: "legacy",
    url: "https://legacy.grdn.pl",
    environment: "prod",
    enabled: true,
    visibleInHome: true,
    access: [{ source: "realm", anyRoles: ["manager"] }],
  };
}

function createUser(params: {
  userId: string;
  realmRoles?: string[];
}): UserAccessProfile {
  return {
    userId: params.userId,
    username: params.userId,
    displayName: params.userId,
    realmRoles: params.realmRoles ?? [],
    clientRoles: {},
  };
}

test("resolver grants snapshot access to all authenticated users for fresh all_authenticated snapshots", () => {
  const now = Date.parse("2026-04-16T08:00:00.000Z");
  const entry = createSnapshotApp("home-dashboard", "all_authenticated");
  const syncStateMap = new Map<string, AccessSnapshotState>([
    [
      entry.id,
      {
        app_id: entry.id,
        status: "ok",
        subject_mode: "all_authenticated",
        generated_at: "2026-04-16T07:59:00.000Z",
        fetched_at: now - 1_000,
        expires_at: now + 60_000,
        user_count: null,
        error: null,
      },
    ],
  ]);

  const context = createSnapshotAccessContext({
    entries: [entry],
    userSubs: ["u-1"],
    now,
    syncStateMap,
    membershipRows: [],
  });

  const resolved = resolveAppAccessForUser(entry, createUser({ userId: "u-1" }), context);
  assert.equal(resolved.hasAccess, true);
  assert.equal(resolved.source, "snapshot");
  assert.equal(context.refreshCandidates.size, 0);
});

test("resolver denies failed snapshots and marks them for refresh", () => {
  const now = Date.parse("2026-04-16T08:00:00.000Z");
  const entry = createSnapshotApp("employee", "explicit_users");
  const syncStateMap = new Map<string, AccessSnapshotState>([
    [
      entry.id,
      {
        app_id: entry.id,
        status: "failed",
        subject_mode: "explicit_users",
        generated_at: null,
        fetched_at: now - 1_000,
        expires_at: null,
        user_count: null,
        error: "HTTP_500",
      },
    ],
  ]);

  const context = createSnapshotAccessContext({
    entries: [entry],
    userSubs: ["u-1"],
    now,
    syncStateMap,
    membershipRows: [],
  });

  const resolved = resolveAppAccessForUser(entry, createUser({ userId: "u-1" }), context);
  assert.equal(resolved.hasAccess, false);
  assert.equal(resolved.syncHealth, "failed");
  assert.deepEqual(Array.from(context.refreshCandidates), [entry.id]);
});

test("resolver still uses legacy rules for apps without accessSync", () => {
  const entry = createLegacyApp();
  const context = createSnapshotAccessContext({
    entries: [entry],
    userSubs: ["u-1"],
    membershipRows: [],
  });

  const allowed = resolveAppAccessForUser(
    entry,
    createUser({ userId: "u-1", realmRoles: ["manager"] }),
    context
  );
  const denied = resolveAppAccessForUser(entry, createUser({ userId: "u-2" }), context);

  assert.equal(allowed.hasAccess, true);
  assert.equal(allowed.source, "legacy");
  assert.equal(denied.hasAccess, false);
});
