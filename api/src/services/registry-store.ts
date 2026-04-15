import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  type AppAccessRule,
  type AppAccessSyncConfig,
  type AppManifest,
  type AppRegistrationRecord,
  type AppRegistryEntry,
  type AppRegistryOverride,
} from "../../../shared/app-types.js";
import { appRegistry } from "../../../shared/app-registry.js";
import { appRegistryOverrides } from "../../../shared/app-registry-overrides.js";
import { config } from "../config.js";

const DATA_DIR = path.resolve(config.rootDir, "data");
const REGISTRY_FILE = path.join(DATA_DIR, "app-registry.json");

let registrationCache: AppRegistrationRecord[] | null = null;
let mergedCache: AppRegistryEntry[] | null = null;

const overrideMap = new Map<string, AppRegistryOverride>(
  appRegistryOverrides.map((entry) => [entry.id, entry])
);

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

function isAccessRule(rule: unknown): rule is AppAccessRule {
  if (!rule || typeof rule !== "object") return false;
  const r = rule as Record<string, unknown>;
  if (r.source === "authenticated") return true;
  if (r.source === "realm") {
    return Array.isArray(r.anyRoles) && r.anyRoles.every((item) => typeof item === "string");
  }
  if (r.source === "client") {
    return (
      typeof r.clientId === "string" &&
      r.clientId.length > 0 &&
      Array.isArray(r.anyRoles) &&
      r.anyRoles.every((item) => typeof item === "string")
    );
  }
  return false;
}

function isAccessSyncConfig(value: unknown): value is AppAccessSyncConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.mode === "pull_snapshot_v1" && typeof v.url === "string" && /^https:\/\//.test(v.url);
}

function normalizeRecord(input: unknown): AppRegistrationRecord | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;

  if (
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    typeof row.description !== "string" ||
    typeof row.url !== "string" ||
    row.environment !== "prod"
  ) {
    return null;
  }

  return {
    id: row.id,
    name: row.name.trim(),
    description: row.description,
    url: row.url,
    environment: "prod",
    category: typeof row.category === "string" ? row.category : undefined,
    access: Array.isArray(row.access) ? row.access.filter(isAccessRule) : undefined,
    accessSync: isAccessSyncConfig(row.accessSync) ? row.accessSync : undefined,
    lastRegisteredAt: typeof row.lastRegisteredAt === "string" ? row.lastRegisteredAt : undefined,
  };
}

function mergeRecord(
  record: AppRegistrationRecord,
  override: AppRegistryOverride | undefined
): AppRegistryEntry {
  return {
    ...record,
    sourcePath: override?.sourcePath,
    enabled: override?.enabled ?? true,
    visibleInHome: override?.visibleInHome ?? true,
  };
}

function mergeAll(records: AppRegistrationRecord[]): AppRegistryEntry[] {
  return records.map((record) => mergeRecord(record, overrideMap.get(record.id)));
}

async function saveRegistrationRecords(records: AppRegistrationRecord[]): Promise<void> {
  await ensureDataDir();
  await writeFile(REGISTRY_FILE, JSON.stringify(records, null, 2), "utf8");
  registrationCache = records;
  mergedCache = mergeAll(records);
}

async function loadRegistrationRecords(): Promise<AppRegistrationRecord[]> {
  if (registrationCache) return registrationCache;

  try {
    const raw = await readFile(REGISTRY_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown[];
    const normalized = Array.isArray(parsed)
      ? parsed
          .map(normalizeRecord)
          .filter((record): record is AppRegistrationRecord => record !== null)
      : [];
    const now = new Date().toISOString();
    let dirty = false;
    for (const record of normalized) {
      if (!record.lastRegisteredAt) {
        record.lastRegisteredAt = now;
        dirty = true;
      }
    }
    registrationCache = normalized;
    mergedCache = mergeAll(normalized);
    if (dirty) await saveRegistrationRecords(normalized);
    return registrationCache;
  } catch {
    const now = new Date().toISOString();
    const seeded: AppRegistrationRecord[] = appRegistry.map((entry: AppManifest) => ({
      ...entry,
      lastRegisteredAt: now,
    }));
    await saveRegistrationRecords(seeded);
    return seeded;
  }
}

export async function loadRegistry(): Promise<AppRegistryEntry[]> {
  if (mergedCache) return mergedCache;
  const records = await loadRegistrationRecords();
  mergedCache = mergeAll(records);
  return mergedCache;
}

export async function getAll(): Promise<AppRegistryEntry[]> {
  return loadRegistry();
}

export async function getById(id: string): Promise<AppRegistryEntry | undefined> {
  const all = await loadRegistry();
  return all.find((entry) => entry.id === id);
}

export async function upsert(entry: AppRegistrationRecord): Promise<{ created: boolean }> {
  const records = await loadRegistrationRecords();
  const idx = records.findIndex((row) => row.id === entry.id);
  if (idx >= 0) {
    records[idx] = entry;
    await saveRegistrationRecords(records);
    return { created: false };
  }
  records.push(entry);
  await saveRegistrationRecords(records);
  return { created: true };
}

const STALE_MAX_AGE_MS = 25 * 60 * 60 * 1000; // 25h

export function isStale(
  entry: Pick<AppRegistrationRecord, "lastRegisteredAt">,
  now: number = Date.now()
): boolean {
  if (!entry.lastRegisteredAt) return true;
  const registeredAt = Date.parse(entry.lastRegisteredAt);
  if (!Number.isFinite(registeredAt)) return true;
  return now - registeredAt > STALE_MAX_AGE_MS;
}

export async function remove(id: string): Promise<boolean> {
  const records = await loadRegistrationRecords();
  const idx = records.findIndex((entry) => entry.id === id);
  if (idx < 0) return false;
  records.splice(idx, 1);
  await saveRegistrationRecords(records);
  return true;
}
