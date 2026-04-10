import path from "node:path";
import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { config } from "../config.js";

const DATA_DIR = path.resolve(config.rootDir, "data");
const DB_FILE = path.join(DATA_DIR, "uptime.sqlite");

mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_FILE);
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

export type UptimeStatus = "up" | "down";

export type UptimeCheckRow = {
  app_id: string;
  checked_at: number;
  status: UptimeStatus;
  http_code: number | null;
  latency_ms: number | null;
  error: string | null;
};

const insertStmt = db.prepare(`
  INSERT INTO uptime_checks (app_id, checked_at, status, http_code, latency_ms, error)
  VALUES (@app_id, @checked_at, @status, @http_code, @latency_ms, @error)
`);

export function insertCheck(row: UptimeCheckRow): void {
  insertStmt.run(row);
}

const rangeStmt = db.prepare(`
  SELECT app_id, checked_at, status, http_code, latency_ms
  FROM uptime_checks
  WHERE checked_at >= ? AND checked_at <= ?
  ORDER BY checked_at ASC
`);

export type UptimePoint = {
  app_id: string;
  checked_at: number;
  status: UptimeStatus;
  http_code: number | null;
  latency_ms: number | null;
};

export function getChecksInRange(startMs: number, endMs: number): UptimePoint[] {
  return rangeStmt.all(startMs, endMs) as UptimePoint[];
}

const deleteOldStmt = db.prepare(`DELETE FROM uptime_checks WHERE checked_at < ?`);

export function deleteOlderThan(cutoffMs: number): number {
  const result = deleteOldStmt.run(cutoffMs);
  return Number(result.changes);
}
