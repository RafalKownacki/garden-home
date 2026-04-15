import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { AppRegistryEntry } from "../../../shared/app-types.js";
import * as registryModule from "../../../shared/app-registry.js";
import type { AppRegistryEntry as _ART } from "../../../shared/app-types.js";

const seedRegistry: _ART[] =
  "appRegistry" in registryModule && Array.isArray(registryModule.appRegistry)
    ? registryModule.appRegistry
    : "default" in registryModule &&
        registryModule.default &&
        typeof registryModule.default === "object" &&
        "appRegistry" in (registryModule.default as Record<string, unknown>) &&
        Array.isArray((registryModule.default as Record<string, unknown>).appRegistry)
      ? ((registryModule.default as { appRegistry: _ART[] }).appRegistry)
      : [];
import { config } from "../config.js";

const DATA_DIR = path.resolve(config.rootDir, "data");
const REGISTRY_FILE = path.join(DATA_DIR, "app-registry.json");

let cache: AppRegistryEntry[] | null = null;

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function loadRegistry(): Promise<AppRegistryEntry[]> {
  if (cache) return cache;

  try {
    const raw = await readFile(REGISTRY_FILE, "utf8");
    const parsed = JSON.parse(raw) as AppRegistryEntry[];
    // Backfill lastRegisteredAt for entries persisted before self-registration
    // was introduced — ensures they survive the stale filter until they re-register.
    const now = new Date().toISOString();
    let dirty = false;
    for (const entry of parsed) {
      if (!entry.lastRegisteredAt) {
        entry.lastRegisteredAt = now;
        dirty = true;
      }
    }
    cache = parsed;
    if (dirty) await saveRegistry(cache);
    return cache;
  } catch {
    // File doesn't exist — seed from static registry.
    // Seeded entries get a fresh lastRegisteredAt so they survive the stale filter
    // until the satellite apps start self-registering (migration Phase B).
    const now = new Date().toISOString();
    cache = seedRegistry.map((e) => ({ ...e, lastRegisteredAt: e.lastRegisteredAt ?? now }));
    await saveRegistry(cache);
    return cache;
  }
}

async function saveRegistry(entries: AppRegistryEntry[]): Promise<void> {
  await ensureDataDir();
  await writeFile(REGISTRY_FILE, JSON.stringify(entries, null, 2), "utf8");
  cache = entries;
}

export async function getAll(): Promise<AppRegistryEntry[]> {
  return loadRegistry();
}

export async function getById(id: string): Promise<AppRegistryEntry | undefined> {
  const all = await loadRegistry();
  return all.find((e) => e.id === id);
}

export async function upsert(entry: AppRegistryEntry): Promise<{ created: boolean }> {
  const all = await loadRegistry();
  const idx = all.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    all[idx] = entry;
    await saveRegistry(all);
    return { created: false };
  }
  all.push(entry);
  await saveRegistry(all);
  return { created: true };
}

const STALE_MAX_AGE_MS = 25 * 60 * 60 * 1000; // 25h

export function isStale(entry: AppRegistryEntry, now: number = Date.now()): boolean {
  if (!entry.lastRegisteredAt) return true;
  const registeredAt = Date.parse(entry.lastRegisteredAt);
  if (!Number.isFinite(registeredAt)) return true;
  return now - registeredAt > STALE_MAX_AGE_MS;
}

export async function remove(id: string): Promise<boolean> {
  const all = await loadRegistry();
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) return false;
  all.splice(idx, 1);
  await saveRegistry(all);
  return true;
}
