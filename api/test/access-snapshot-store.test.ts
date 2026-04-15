import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import type { AppRegistryEntry } from "../../shared/app-types.js";
import {
  createAccessSnapshotStore,
  type AccessSnapshotState,
} from "../src/services/access-snapshot-store.js";
import { describeAccessSyncHealth } from "../src/services/access-sync-service.js";

function createSnapshotApp(id: string): AppRegistryEntry {
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
  };
}

test("markAccessSnapshotFailure clears previously active snapshot state and membership", () => {
  const store = createAccessSnapshotStore({ db: new Database(":memory:") });
  const now = Date.parse("2026-04-16T08:00:00.000Z");

  store.replaceAccessSnapshot({
    appId: "employee",
    generatedAt: "2026-04-16T08:00:00.000Z",
    fetchedAt: now,
    expiresAt: now + 60_000,
    subjectMode: "explicit_users",
    userSubs: ["u-1", "u-2"],
  });

  store.markAccessSnapshotFailure({
    appId: "employee",
    fetchedAt: now + 5_000,
    error: "HTTP_500",
  });

  const state = store.getAccessSnapshotState("employee");
  assert.equal(state?.status, "failed");
  assert.equal(state?.generated_at, null);
  assert.equal(state?.expires_at, null);
  assert.equal(state?.user_count, null);
  assert.deepEqual(store.listAccessibleAppIdsForUser("u-1", now + 10_000), []);
  assert.deepEqual(store.listUsersWithAccessToApp("employee", now + 10_000), []);
  assert.equal(describeAccessSyncHealth(createSnapshotApp("employee"), state, now + 10_000), "failed");

  store.close();
});

test("markAccessSnapshotMode clears legacy access snapshot state and membership", () => {
  const store = createAccessSnapshotStore({ db: new Database(":memory:") });
  const now = Date.parse("2026-04-16T08:00:00.000Z");

  store.replaceAccessSnapshot({
    appId: "employee",
    generatedAt: "2026-04-16T08:00:00.000Z",
    fetchedAt: now,
    expiresAt: now + 60_000,
    subjectMode: "explicit_users",
    userSubs: ["u-1"],
  });

  store.markAccessSnapshotMode("employee", "legacy");

  const state = store.getAccessSnapshotState("employee");
  assert.equal(state?.status, "legacy");
  assert.equal(state?.generated_at, null);
  assert.equal(state?.expires_at, null);
  assert.equal(state?.user_count, null);
  assert.deepEqual(store.listUsersWithAccessToApp("employee", now + 10_000), []);

  store.close();
});

test("store initialization normalizes stale failed rows created before the refactor", () => {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE access_snapshot_state (
      app_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      subject_mode TEXT NOT NULL,
      generated_at TEXT,
      fetched_at INTEGER,
      expires_at INTEGER,
      user_count INTEGER,
      error TEXT
    );

    CREATE TABLE access_snapshot_membership (
      app_id TEXT NOT NULL,
      user_sub TEXT NOT NULL,
      PRIMARY KEY (app_id, user_sub)
    );
  `);

  db.prepare(`
    INSERT INTO access_snapshot_state (
      app_id, status, subject_mode, generated_at, fetched_at, expires_at, user_count, error
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "employee",
    "failed",
    "explicit_users",
    "2026-04-16T07:00:00.000Z",
    Date.parse("2026-04-16T07:05:00.000Z"),
    Date.parse("2026-04-16T09:00:00.000Z"),
    1,
    "HTTP_500"
  );
  db.prepare(`
    INSERT INTO access_snapshot_membership (app_id, user_sub)
    VALUES (?, ?)
  `).run("employee", "u-1");

  const store = createAccessSnapshotStore({ db });
  const state = store.getAccessSnapshotState("employee") as AccessSnapshotState;

  assert.equal(state.status, "failed");
  assert.equal(state.generated_at, null);
  assert.equal(state.expires_at, null);
  assert.equal(state.user_count, null);
  assert.deepEqual(store.listUsersWithAccessToApp("employee", Date.now()), []);

  store.close();
});
