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
    cache = JSON.parse(raw) as AppRegistryEntry[];
    return cache;
  } catch {
    // File doesn't exist — seed from static registry
    cache = [...seedRegistry];
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

export async function remove(id: string): Promise<boolean> {
  const all = await loadRegistry();
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) return false;
  all.splice(idx, 1);
  await saveRegistry(all);
  return true;
}
