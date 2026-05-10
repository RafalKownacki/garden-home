import path from "node:path";
import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { config } from "../config.js";

const DATA_DIR = path.resolve(config.rootDir, "data");
const DB_FILE = path.join(DATA_DIR, "uptime.sqlite");

mkdirSync(DATA_DIR, { recursive: true });

type SqliteDatabase = InstanceType<typeof Database>;

export type UptimeStatus = "up" | "down";

export type UptimeCheckRow = {
  app_id: string;
  checked_at: number;
  status: UptimeStatus;
  http_code: number | null;
  latency_ms: number | null;
  error: string | null;
};

export type UptimePoint = {
  app_id: string;
  checked_at: number;
  status: UptimeStatus;
  http_code: number | null;
  latency_ms: number | null;
};

function initializeDatabase(db: SqliteDatabase): void {
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS uptime_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id TEXT NOT NULL,
      checked_at INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('up', 'down')),
      http_code INTEGER,
      latency_ms INTEGER,
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_uptime_app_time ON uptime_checks (app_id, checked_at);
  `);
}

type LatestRow = { app_id: string; status: UptimeStatus; checked_at: number };

export function createUptimeStore(options?: {
  db?: SqliteDatabase;
  dbFile?: string;
}) {
  const db = options?.db ?? new Database(options?.dbFile ?? DB_FILE);
  initializeDatabase(db);

  const insertStmt = db.prepare(`
    INSERT INTO uptime_checks (app_id, checked_at, status, http_code, latency_ms, error)
    VALUES (@app_id, @checked_at, @status, @http_code, @latency_ms, @error)
  `);

  const rangeStmt = db.prepare(`
    SELECT app_id, checked_at, status, http_code, latency_ms
    FROM uptime_checks
    WHERE checked_at >= ? AND checked_at <= ?
    ORDER BY checked_at ASC
  `);

  const latestPerAppStmt = db.prepare(`
    SELECT app_id, status, checked_at
    FROM uptime_checks
    WHERE id IN (
      SELECT MAX(id) FROM uptime_checks GROUP BY app_id
    )
  `);

  const deleteOldStmt = db.prepare(`DELETE FROM uptime_checks WHERE checked_at < ?`);

  return {
    close(): void {
      db.close();
    },

    insertCheck(row: UptimeCheckRow): void {
      insertStmt.run(row);
    },

    getChecksInRange(startMs: number, endMs: number): UptimePoint[] {
      return rangeStmt.all(startMs, endMs) as UptimePoint[];
    },

    getLatestStatusPerApp(): Map<string, UptimeStatus> {
      const rows = latestPerAppStmt.all() as LatestRow[];
      const map = new Map<string, UptimeStatus>();
      for (const row of rows) map.set(row.app_id, row.status);
      return map;
    },

    deleteOlderThan(cutoffMs: number): number {
      const result = deleteOldStmt.run(cutoffMs);
      return Number(result.changes);
    },
  };
}

let defaultStore: ReturnType<typeof createUptimeStore> | null = null;

function getDefaultStore() {
  if (!defaultStore) defaultStore = createUptimeStore();
  return defaultStore;
}

export function insertCheck(row: UptimeCheckRow): void {
  getDefaultStore().insertCheck(row);
}

export function getChecksInRange(startMs: number, endMs: number): UptimePoint[] {
  return getDefaultStore().getChecksInRange(startMs, endMs);
}

export function getLatestStatusPerApp(): Map<string, UptimeStatus> {
  return getDefaultStore().getLatestStatusPerApp();
}

export function deleteOlderThan(cutoffMs: number): number {
  return getDefaultStore().deleteOlderThan(cutoffMs);
}
