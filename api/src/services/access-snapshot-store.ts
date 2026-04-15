import path from "node:path";
import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import type { AccessSnapshotSubjectMode } from "../../../shared/app-types.js";
import { config } from "../config.js";

const DATA_DIR = path.resolve(config.rootDir, "data");
const DB_FILE = path.join(DATA_DIR, "access-snapshots.sqlite");

mkdirSync(DATA_DIR, { recursive: true });

export type AccessSnapshotStateStatus = "ok" | "failed" | "legacy" | "not_configured";

export type AccessSnapshotState = {
  app_id: string;
  status: AccessSnapshotStateStatus;
  subject_mode: AccessSnapshotSubjectMode | null;
  generated_at: string | null;
  fetched_at: number | null;
  expires_at: number | null;
  user_count: number | null;
  error: string | null;
};

export type AccessSnapshotMembershipRow = {
  app_id: string;
  user_sub: string;
};

type SqliteDatabase = InstanceType<typeof Database>;

const NON_ACTIVE_STATUSES: AccessSnapshotStateStatus[] = [
  "failed",
  "legacy",
  "not_configured",
];

function initializeDatabase(db: SqliteDatabase): void {
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS access_snapshot_state (
      app_id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN ('ok', 'failed', 'legacy', 'not_configured')),
      subject_mode TEXT NOT NULL DEFAULT 'explicit_users'
        CHECK (subject_mode IN ('explicit_users', 'all_authenticated')),
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

  const stateColumns = db.prepare("PRAGMA table_info(access_snapshot_state)").all() as Array<{ name: string }>;
  if (!stateColumns.some((column) => column.name === "subject_mode")) {
    db.exec(`
      ALTER TABLE access_snapshot_state
      ADD COLUMN subject_mode TEXT NOT NULL DEFAULT 'explicit_users'
        CHECK (subject_mode IN ('explicit_users', 'all_authenticated'))
    `);
  }

  const nonActiveStatusesSql = NON_ACTIVE_STATUSES.map((status) => `'${status}'`).join(", ");
  db.exec(`
    UPDATE access_snapshot_state
    SET generated_at = NULL,
        expires_at = NULL,
        user_count = NULL
    WHERE status IN (${nonActiveStatusesSql})
      AND (generated_at IS NOT NULL OR expires_at IS NOT NULL OR user_count IS NOT NULL);

    DELETE FROM access_snapshot_membership
    WHERE app_id IN (
      SELECT app_id
      FROM access_snapshot_state
      WHERE status IN (${nonActiveStatusesSql}) OR subject_mode = 'all_authenticated'
    );
  `);
}

export function createAccessSnapshotStore(options?: {
  db?: SqliteDatabase;
  dbFile?: string;
}) {
  const db = options?.db ?? new Database(options?.dbFile ?? DB_FILE);
  initializeDatabase(db);

  const upsertSuccessStateStmt = db.prepare(`
    INSERT INTO access_snapshot_state (app_id, status, subject_mode, generated_at, fetched_at, expires_at, user_count, error)
    VALUES (@app_id, 'ok', @subject_mode, @generated_at, @fetched_at, @expires_at, @user_count, NULL)
    ON CONFLICT(app_id) DO UPDATE SET
      status = excluded.status,
      subject_mode = excluded.subject_mode,
      generated_at = excluded.generated_at,
      fetched_at = excluded.fetched_at,
      expires_at = excluded.expires_at,
      user_count = excluded.user_count,
      error = NULL
  `);

  const upsertFailureStateStmt = db.prepare(`
    INSERT INTO access_snapshot_state (app_id, status, subject_mode, generated_at, fetched_at, expires_at, user_count, error)
    VALUES (@app_id, 'failed', @subject_mode, NULL, @fetched_at, NULL, NULL, @error)
    ON CONFLICT(app_id) DO UPDATE SET
      status = excluded.status,
      subject_mode = COALESCE(access_snapshot_state.subject_mode, excluded.subject_mode),
      generated_at = NULL,
      fetched_at = excluded.fetched_at,
      expires_at = NULL,
      user_count = NULL,
      error = excluded.error
  `);

  const upsertMarkerStateStmt = db.prepare(`
    INSERT INTO access_snapshot_state (app_id, status, subject_mode, fetched_at, generated_at, expires_at, user_count, error)
    VALUES (@app_id, @status, 'explicit_users', NULL, NULL, NULL, NULL, NULL)
    ON CONFLICT(app_id) DO UPDATE SET
      status = excluded.status,
      subject_mode = excluded.subject_mode,
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
    subjectMode: AccessSnapshotSubjectMode;
    userSubs: string[];
  }) => {
    upsertSuccessStateStmt.run({
      app_id: params.appId,
      subject_mode: params.subjectMode,
      generated_at: params.generatedAt,
      fetched_at: params.fetchedAt,
      expires_at: params.expiresAt,
      user_count: params.subjectMode === "all_authenticated" ? null : params.userSubs.length,
    });
    deleteMembershipStmt.run(params.appId);
    for (const userSub of params.userSubs) {
      insertMembershipStmt.run(params.appId, userSub);
    }
  });

  const markFailureTx = db.transaction((params: {
    appId: string;
    fetchedAt: number;
    error: string;
  }) => {
    deleteMembershipStmt.run(params.appId);
    upsertFailureStateStmt.run({
      app_id: params.appId,
      subject_mode: "explicit_users",
      fetched_at: params.fetchedAt,
      error: params.error.slice(0, 500),
    });
  });

  const clearAndMarkStateTx = db.transaction((appId: string, status: AccessSnapshotStateStatus) => {
    deleteMembershipStmt.run(appId);
    upsertMarkerStateStmt.run({ app_id: appId, status });
  });

  const allStatesStmt = db.prepare(`
    SELECT app_id, status, subject_mode, generated_at, fetched_at, expires_at, user_count, error
    FROM access_snapshot_state
  `);

  const stateByIdStmt = db.prepare(`
    SELECT app_id, status, subject_mode, generated_at, fetched_at, expires_at, user_count, error
    FROM access_snapshot_state
    WHERE app_id = ?
  `);

  const explicitAppIdsForUserStmt = db.prepare(`
    SELECT m.app_id
    FROM access_snapshot_membership m
    JOIN access_snapshot_state s ON s.app_id = m.app_id
    WHERE m.user_sub = ? AND s.expires_at > ? AND s.subject_mode = 'explicit_users'
  `);

  const allAuthenticatedAppIdsStmt = db.prepare(`
    SELECT app_id
    FROM access_snapshot_state
    WHERE expires_at > ? AND subject_mode = 'all_authenticated'
  `);

  const usersForAppStmt = db.prepare(`
    SELECT m.user_sub
    FROM access_snapshot_membership m
    JOIN access_snapshot_state s ON s.app_id = m.app_id
    WHERE m.app_id = ? AND s.expires_at > ? AND s.subject_mode = 'explicit_users'
  `);

  return {
    close(): void {
      db.close();
    },

    replaceAccessSnapshot(params: {
      appId: string;
      generatedAt: string;
      fetchedAt: number;
      expiresAt: number;
      subjectMode: AccessSnapshotSubjectMode;
      userSubs: string[];
    }): void {
      replaceSnapshotTx(params);
    },

    markAccessSnapshotFailure(params: {
      appId: string;
      fetchedAt: number;
      error: string;
    }): void {
      markFailureTx(params);
    },

    markAccessSnapshotMode(
      appId: string,
      status: Extract<AccessSnapshotStateStatus, "legacy" | "not_configured">
    ): void {
      clearAndMarkStateTx(appId, status);
    },

    getAccessSnapshotState(appId: string): AccessSnapshotState | undefined {
      return stateByIdStmt.get(appId) as AccessSnapshotState | undefined;
    },

    listAccessSnapshotStates(): Map<string, AccessSnapshotState> {
      const rows = allStatesStmt.all() as AccessSnapshotState[];
      return new Map(rows.map((row) => [row.app_id, row]));
    },

    listAccessibleAppIdsForUser(userSub: string, now: number): string[] {
      const explicitRows = explicitAppIdsForUserStmt.all(userSub, now) as Array<{ app_id: string }>;
      const allAuthenticatedRows = allAuthenticatedAppIdsStmt.all(now) as Array<{ app_id: string }>;
      return Array.from(new Set([...explicitRows, ...allAuthenticatedRows].map((row) => row.app_id)));
    },

    listUsersWithAccessToApp(appId: string, now: number): string[] {
      const rows = usersForAppStmt.all(appId, now) as Array<{ user_sub: string }>;
      return rows.map((row) => row.user_sub);
    },

    getFreshMembershipRows(
      appIds: string[],
      userSubs: string[],
      now: number
    ): AccessSnapshotMembershipRow[] {
      if (appIds.length === 0 || userSubs.length === 0) return [];

      const appPlaceholders = appIds.map(() => "?").join(", ");
      const chunks = chunk(userSubs, 400);
      const rows: AccessSnapshotMembershipRow[] = [];

      for (const subset of chunks) {
        const userPlaceholders = subset.map(() => "?").join(", ");
        const stmt = db.prepare(`
          SELECT m.app_id, m.user_sub
          FROM access_snapshot_membership m
          JOIN access_snapshot_state s ON s.app_id = m.app_id
          WHERE s.expires_at > ?
            AND s.subject_mode = 'explicit_users'
            AND m.app_id IN (${appPlaceholders})
            AND m.user_sub IN (${userPlaceholders})
        `);
        rows.push(...(stmt.all(now, ...appIds, ...subset) as AccessSnapshotMembershipRow[]));
      }

      return rows;
    },
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

let defaultStore: ReturnType<typeof createAccessSnapshotStore> | null = null;

function getDefaultStore() {
  if (!defaultStore) {
    defaultStore = createAccessSnapshotStore();
  }
  return defaultStore;
}

export function replaceAccessSnapshot(params: {
  appId: string;
  generatedAt: string;
  fetchedAt: number;
  expiresAt: number;
  subjectMode: AccessSnapshotSubjectMode;
  userSubs: string[];
}): void {
  getDefaultStore().replaceAccessSnapshot(params);
}

export function markAccessSnapshotFailure(params: {
  appId: string;
  fetchedAt: number;
  error: string;
}): void {
  getDefaultStore().markAccessSnapshotFailure(params);
}

export function markAccessSnapshotMode(
  appId: string,
  status: Extract<AccessSnapshotStateStatus, "legacy" | "not_configured">
): void {
  getDefaultStore().markAccessSnapshotMode(appId, status);
}

export function getAccessSnapshotState(appId: string): AccessSnapshotState | undefined {
  return getDefaultStore().getAccessSnapshotState(appId);
}

export function listAccessSnapshotStates(): Map<string, AccessSnapshotState> {
  return getDefaultStore().listAccessSnapshotStates();
}

export function listAccessibleAppIdsForUser(userSub: string, now: number): string[] {
  return getDefaultStore().listAccessibleAppIdsForUser(userSub, now);
}

export function listUsersWithAccessToApp(appId: string, now: number): string[] {
  return getDefaultStore().listUsersWithAccessToApp(appId, now);
}

export function getFreshMembershipRows(
  appIds: string[],
  userSubs: string[],
  now: number
): AccessSnapshotMembershipRow[] {
  return getDefaultStore().getFreshMembershipRows(appIds, userSubs, now);
}
