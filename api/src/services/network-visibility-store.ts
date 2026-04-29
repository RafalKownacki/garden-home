import path from "node:path";
import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import type { AppNetworkVisibilityMode } from "../../../shared/app-types.js";
import { config } from "../config.js";

const DATA_DIR = path.resolve(config.rootDir, "data");
const DB_FILE = path.join(DATA_DIR, "app-network-visibility.sqlite");

mkdirSync(DATA_DIR, { recursive: true });

type SqliteDatabase = InstanceType<typeof Database>;

type StoredMode = Exclude<AppNetworkVisibilityMode, "unknown">;

const STORED_MODES: StoredMode[] = ["whitelist-lan", "lan", "internet"];

function isStoredMode(value: string): value is StoredMode {
  return (STORED_MODES as string[]).includes(value);
}

function initializeDatabase(db: SqliteDatabase): void {
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_network_visibility (
      app_id TEXT PRIMARY KEY,
      mode TEXT NOT NULL CHECK (mode IN ('whitelist-lan', 'lan', 'internet')),
      updated_at INTEGER NOT NULL,
      updated_by TEXT
    );
  `);
}

export function createNetworkVisibilityStore(options?: {
  db?: SqliteDatabase;
  dbFile?: string;
}) {
  const db = options?.db ?? new Database(options?.dbFile ?? DB_FILE);
  initializeDatabase(db);

  const upsertStmt = db.prepare(`
    INSERT INTO app_network_visibility (app_id, mode, updated_at, updated_by)
    VALUES (@app_id, @mode, @updated_at, @updated_by)
    ON CONFLICT(app_id) DO UPDATE SET
      mode = excluded.mode,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `);

  const deleteStmt = db.prepare(`DELETE FROM app_network_visibility WHERE app_id = ?`);

  const getByIdStmt = db.prepare(`SELECT mode FROM app_network_visibility WHERE app_id = ?`);

  const listAllStmt = db.prepare(`SELECT app_id, mode FROM app_network_visibility`);

  return {
    close(): void {
      db.close();
    },

    getNetworkVisibilityMode(appId: string): AppNetworkVisibilityMode {
      const row = getByIdStmt.get(appId) as { mode: string } | undefined;
      if (!row || !isStoredMode(row.mode)) return "unknown";
      return row.mode;
    },

    listNetworkVisibilityModes(): Map<string, AppNetworkVisibilityMode> {
      const rows = listAllStmt.all() as Array<{ app_id: string; mode: string }>;
      const map = new Map<string, AppNetworkVisibilityMode>();
      for (const row of rows) {
        if (isStoredMode(row.mode)) map.set(row.app_id, row.mode);
      }
      return map;
    },

    setNetworkVisibilityMode(
      appId: string,
      mode: AppNetworkVisibilityMode,
      updatedBy: string | null
    ): void {
      if (mode === "unknown") {
        deleteStmt.run(appId);
        return;
      }
      upsertStmt.run({
        app_id: appId,
        mode,
        updated_at: Date.now(),
        updated_by: updatedBy,
      });
    },
  };
}

let defaultStore: ReturnType<typeof createNetworkVisibilityStore> | null = null;

function getDefaultStore() {
  if (!defaultStore) defaultStore = createNetworkVisibilityStore();
  return defaultStore;
}

export function getNetworkVisibilityMode(appId: string): AppNetworkVisibilityMode {
  return getDefaultStore().getNetworkVisibilityMode(appId);
}

export function listNetworkVisibilityModes(): Map<string, AppNetworkVisibilityMode> {
  return getDefaultStore().listNetworkVisibilityModes();
}

export function setNetworkVisibilityMode(
  appId: string,
  mode: AppNetworkVisibilityMode,
  updatedBy: string | null
): void {
  getDefaultStore().setNetworkVisibilityMode(appId, mode, updatedBy);
}
