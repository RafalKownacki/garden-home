import path from "node:path";
import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { config } from "../config.js";

const DATA_DIR = path.resolve(config.rootDir, "data");
const DB_FILE = path.join(DATA_DIR, "access-snapshots.sqlite");

mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS access_snapshot_state (
    app_id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('ok', 'failed', 'legacy', 'not_configured')),
    generated_at TEXT,
    fetched_at INTEGER,
    expires_at INTEGER,
    user_count INTEGER,
    error TEXT
  );

  CREATE TABLE IF NOT EXISTS access_snapshot_membership (
    app_id TEXT NOT NULL,
    user_sub TEXT NOT NULL,
    PRIMARY KEY (app_id, user_sub),
    FOREIGN KEY (app_id) REFERENCES access_snapshot_state(app_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_access_snapshot_membership_user
    ON access_snapshot_membership (user_sub, app_id);
`);

export type AccessSnapshotStateStatus = "ok" | "failed" | "legacy" | "not_configured";

export type AccessSnapshotState = {
  app_id: string;
  status: AccessSnapshotStateStatus;
  generated_at: string | null;
  fetched_at: number | null;
  expires_at: number | null;
  user_count: number | null;
  error: string | null;
};

type MembershipRow = {
  app_id: string;
  user_sub: string;
};

const upsertSuccessStateStmt = db.prepare(`
  INSERT INTO access_snapshot_state (app_id, status, generated_at, fetched_at, expires_at, user_count, error)
  VALUES (@app_id, 'ok', @generated_at, @fetched_at, @expires_at, @user_count, NULL)
  ON CONFLICT(app_id) DO UPDATE SET
    status = excluded.status,
    generated_at = excluded.generated_at,
    fetched_at = excluded.fetched_at,
    expires_at = excluded.expires_at,
    user_count = excluded.user_count,
    error = NULL
`);

const upsertFailureStateStmt = db.prepare(`
  INSERT INTO access_snapshot_state (app_id, status, fetched_at, error)
  VALUES (@app_id, 'failed', @fetched_at, @error)
  ON CONFLICT(app_id) DO UPDATE SET
    status = excluded.status,
    fetched_at = excluded.fetched_at,
    error = excluded.error
`);

const upsertMarkerStateStmt = db.prepare(`
  INSERT INTO access_snapshot_state (app_id, status, fetched_at, generated_at, expires_at, user_count, error)
  VALUES (@app_id, @status, NULL, NULL, NULL, NULL, NULL)
  ON CONFLICT(app_id) DO UPDATE SET
    status = excluded.status,
    fetched_at = NULL,
    generated_at = NULL,
    expires_at = NULL,
    user_count = NULL,
    error = NULL
`);

const deleteMembershipStmt = db.prepare(`
  DELETE FROM access_snapshot_membership WHERE app_id = ?
`);

const insertMembershipStmt = db.prepare(`
  INSERT OR IGNORE INTO access_snapshot_membership (app_id, user_sub)
  VALUES (?, ?)
`);

const replaceSnapshotTx = db.transaction((params: {
  appId: string;
  generatedAt: string;
  fetchedAt: number;
  expiresAt: number;
  userSubs: string[];
}) => {
  upsertSuccessStateStmt.run({
    app_id: params.appId,
    generated_at: params.generatedAt,
    fetched_at: params.fetchedAt,
    expires_at: params.expiresAt,
    user_count: params.userSubs.length,
  });
  deleteMembershipStmt.run(params.appId);
  for (const userSub of params.userSubs) {
    insertMembershipStmt.run(params.appId, userSub);
  }
});

const clearAndMarkStateTx = db.transaction((appId: string, status: AccessSnapshotStateStatus) => {
  deleteMembershipStmt.run(appId);
  upsertMarkerStateStmt.run({ app_id: appId, status });
});

const allStatesStmt = db.prepare(`
  SELECT app_id, status, generated_at, fetched_at, expires_at, user_count, error
  FROM access_snapshot_state
`);

const stateByIdStmt = db.prepare(`
  SELECT app_id, status, generated_at, fetched_at, expires_at, user_count, error
  FROM access_snapshot_state
  WHERE app_id = ?
`);

const appIdsForUserStmt = db.prepare(`
  SELECT m.app_id
  FROM access_snapshot_membership m
  JOIN access_snapshot_state s ON s.app_id = m.app_id
  WHERE m.user_sub = ? AND s.expires_at > ?
`);

const usersForAppStmt = db.prepare(`
  SELECT m.user_sub
  FROM access_snapshot_membership m
  JOIN access_snapshot_state s ON s.app_id = m.app_id
  WHERE m.app_id = ? AND s.expires_at > ?
`);

export function replaceAccessSnapshot(params: {
  appId: string;
  generatedAt: string;
  fetchedAt: number;
  expiresAt: number;
  userSubs: string[];
}): void {
  replaceSnapshotTx(params);
}

export function markAccessSnapshotFailure(params: {
  appId: string;
  fetchedAt: number;
  error: string;
}): void {
  upsertFailureStateStmt.run({
    app_id: params.appId,
    fetched_at: params.fetchedAt,
    error: params.error.slice(0, 500),
  });
}

export function markAccessSnapshotMode(
  appId: string,
  status: Extract<AccessSnapshotStateStatus, "legacy" | "not_configured">
): void {
  clearAndMarkStateTx(appId, status);
}

export function getAccessSnapshotState(appId: string): AccessSnapshotState | undefined {
  return stateByIdStmt.get(appId) as AccessSnapshotState | undefined;
}

export function listAccessSnapshotStates(): Map<string, AccessSnapshotState> {
  const rows = allStatesStmt.all() as AccessSnapshotState[];
  return new Map(rows.map((row) => [row.app_id, row]));
}

export function listAccessibleAppIdsForUser(userSub: string, now: number): string[] {
  const rows = appIdsForUserStmt.all(userSub, now) as Array<{ app_id: string }>;
  return rows.map((row) => row.app_id);
}

export function listUsersWithAccessToApp(appId: string, now: number): string[] {
  const rows = usersForAppStmt.all(appId, now) as Array<{ user_sub: string }>;
  return rows.map((row) => row.user_sub);
}

export function getFreshMembershipRows(
  appIds: string[],
  userSubs: string[],
  now: number
): MembershipRow[] {
  if (appIds.length === 0 || userSubs.length === 0) return [];

  const appPlaceholders = appIds.map(() => "?").join(", ");
  const chunks = chunk(userSubs, 400);
  const rows: MembershipRow[] = [];

  for (const subset of chunks) {
    const userPlaceholders = subset.map(() => "?").join(", ");
    const stmt = db.prepare(`
      SELECT m.app_id, m.user_sub
      FROM access_snapshot_membership m
      JOIN access_snapshot_state s ON s.app_id = m.app_id
      WHERE s.expires_at > ?
        AND m.app_id IN (${appPlaceholders})
        AND m.user_sub IN (${userPlaceholders})
    `);
    rows.push(...(stmt.all(now, ...appIds, ...subset) as MembershipRow[]));
  }

  return rows;
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}
