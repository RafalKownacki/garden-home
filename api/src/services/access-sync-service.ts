import { fetch as undiciFetch } from "undici";
import type {
  AccessSnapshotSubjectMode,
  AppRegistryEntry,
  AppAccessSyncConfig,
} from "../../../shared/app-types.js";
import { config } from "../config.js";
import {
  getAccessSnapshotState,
  listAccessSnapshotStates,
  markAccessSnapshotFailure,
  markAccessSnapshotMode,
  replaceAccessSnapshot,
  type AccessSnapshotState,
} from "./access-snapshot-store.js";
import { getById, isStale, loadRegistry } from "./registry-store.js";

type PullSnapshotPayload = {
  appId: string;
  generatedAt: string;
  subjectMode: AccessSnapshotSubjectMode;
  userSubs: string[];
};

export type AccessSyncHealth =
  | "legacy"
  | "fresh"
  | "stale"
  | "failed"
  | "never_synced"
  | "not_configured";

export type AccessSyncResult = {
  appId: string;
  status: "ok" | "failed" | "skipped";
  reason?: string;
  userCount?: number;
};

const inFlight = new Map<string, Promise<AccessSyncResult>>();

function hasPullSnapshotConfig(
  entry: AppRegistryEntry
): entry is AppRegistryEntry & { accessSync: AppAccessSyncConfig } {
  return entry.accessSync?.mode === "pull_snapshot_v1";
}

function isFreshState(state: AccessSnapshotState | undefined, now: number): boolean {
  return Boolean(state?.generated_at && state.expires_at && state.expires_at > now);
}

function normalizeSnapshotPayload(payload: unknown, appId: string): PullSnapshotPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("INVALID_SNAPSHOT_BODY");
  }

  const body = payload as Record<string, unknown>;
  if (body.appId !== appId) {
    throw new Error("SNAPSHOT_APP_ID_MISMATCH");
  }

  if (typeof body.generatedAt !== "string" || !Number.isFinite(Date.parse(body.generatedAt))) {
    throw new Error("INVALID_GENERATED_AT");
  }

  if (
    body.subjectMode !== undefined &&
    body.subjectMode !== "explicit_users" &&
    body.subjectMode !== "all_authenticated"
  ) {
    throw new Error("INVALID_SUBJECT_MODE");
  }

  const subjectMode =
    body.subjectMode === "all_authenticated" ? "all_authenticated" : "explicit_users";

  if (subjectMode === "explicit_users" && !Array.isArray(body.userSubs)) {
    throw new Error("INVALID_USER_SUBS");
  }

  const rawUserSubs = Array.isArray(body.userSubs) ? body.userSubs : [];
  const userSubs =
    subjectMode === "all_authenticated"
      ? []
      : Array.from(
          new Set(
            rawUserSubs
              .filter((item): item is string => typeof item === "string")
              .map((item) => item.trim())
              .filter(Boolean)
          )
        );

  return {
    appId,
    generatedAt: body.generatedAt,
    subjectMode,
    userSubs,
  };
}

async function fetchPullSnapshot(
  app: AppRegistryEntry & { accessSync: AppAccessSyncConfig }
): Promise<PullSnapshotPayload> {
  if (!config.registrationKey) {
    throw new Error("REGISTRATION_KEY_NOT_CONFIGURED");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.accessSyncTimeoutMs);

  try {
    const response = await undiciFetch(app.accessSync.url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.registrationKey}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    return normalizeSnapshotPayload(await response.json(), app.id);
  } finally {
    clearTimeout(timer);
  }
}

async function refreshAppInternal(app: AppRegistryEntry): Promise<AccessSyncResult> {
  if (!app.enabled || app.environment !== "prod" || isStale(app)) {
    return { appId: app.id, status: "skipped", reason: "INACTIVE_OR_STALE" };
  }

  if (!hasPullSnapshotConfig(app)) {
    markAccessSnapshotMode(app.id, app.access?.length ? "legacy" : "not_configured");
    return {
      appId: app.id,
      status: "skipped",
      reason: app.access?.length ? "LEGACY_ACCESS_RULES" : "NO_ACCESS_CONFIGURATION",
    };
  }

  const fetchedAt = Date.now();
  try {
    const payload = await fetchPullSnapshot(app);
    replaceAccessSnapshot({
      appId: app.id,
      generatedAt: payload.generatedAt,
      fetchedAt,
      expiresAt: fetchedAt + config.accessSyncTtlMs,
      subjectMode: payload.subjectMode,
      userSubs: payload.userSubs,
    });
    return {
      appId: app.id,
      status: "ok",
      userCount: payload.subjectMode === "all_authenticated" ? undefined : payload.userSubs.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    markAccessSnapshotFailure({
      appId: app.id,
      fetchedAt,
      error: message,
    });
    return {
      appId: app.id,
      status: "failed",
      reason: message,
    };
  }
}

function runDeduped(appId: string, producer: () => Promise<AccessSyncResult>): Promise<AccessSyncResult> {
  const active = inFlight.get(appId);
  if (active) return active;

  const promise = producer().finally(() => {
    inFlight.delete(appId);
  });
  inFlight.set(appId, promise);
  return promise;
}

export function describeAccessSyncHealth(
  entry: AppRegistryEntry,
  state: AccessSnapshotState | undefined,
  now: number = Date.now()
): AccessSyncHealth {
  if (hasPullSnapshotConfig(entry)) {
    if (!state) return "never_synced";
    if (state.status === "failed") return "failed";
    if (isFreshState(state, now)) return "fresh";
    return state.generated_at ? "stale" : "never_synced";
  }

  return entry.access?.length ? "legacy" : "not_configured";
}

export function getAccessSyncStateMap(): Map<string, AccessSnapshotState> {
  return listAccessSnapshotStates();
}

export function getAccessSyncState(appId: string): AccessSnapshotState | undefined {
  return getAccessSnapshotState(appId);
}

export async function refreshAccessSnapshotForAppId(appId: string): Promise<AccessSyncResult> {
  return runDeduped(appId, async () => {
    const app = await getById(appId);
    if (!app) {
      return { appId, status: "skipped", reason: "APP_NOT_FOUND" };
    }
    return refreshAppInternal(app);
  });
}

export function triggerAccessRefreshInBackground(appId: string): void {
  void refreshAccessSnapshotForAppId(appId).catch((error) => {
    console.error(`[access-sync] background refresh failed for "${appId}":`, error);
  });
}

export async function refreshAllAccessSnapshots(): Promise<void> {
  const registry = await loadRegistry();
  const activeApps = registry.filter((app) => app.enabled && app.environment === "prod");
  await Promise.all(activeApps.map((app) => refreshAccessSnapshotForAppId(app.id)));
}
