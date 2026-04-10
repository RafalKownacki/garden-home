import type { Express, Request, Response } from "express";
import { loadRegistry } from "../services/registry-store.js";
import { getChecksInRange, type UptimePoint } from "../services/uptime-store.js";

type Window = "24h" | "7d" | "30d";

type WindowConfig = {
  durationMs: number;
  bucketSizeMs: number;
};

const WINDOWS: Record<Window, WindowConfig> = {
  "24h": { durationMs: 24 * 60 * 60 * 1000, bucketSizeMs: 5 * 60 * 1000 },
  "7d": { durationMs: 7 * 24 * 60 * 60 * 1000, bucketSizeMs: 60 * 60 * 1000 },
  "30d": { durationMs: 30 * 24 * 60 * 60 * 1000, bucketSizeMs: 6 * 60 * 60 * 1000 }
};

type BucketState = "up" | "down" | "partial" | "unknown";

type AppUptime = {
  id: string;
  name: string;
  url: string;
  category?: string;
  buckets: BucketState[];
  uptimePct: number | null;
};

function parseWindow(raw: unknown): Window {
  if (raw === "7d" || raw === "30d") return raw;
  return "24h";
}

function aggregateBuckets(
  points: UptimePoint[],
  startAt: number,
  bucketSizeMs: number,
  bucketCount: number
): { buckets: BucketState[]; uptimePct: number | null } {
  const upCounts = new Array<number>(bucketCount).fill(0);
  const downCounts = new Array<number>(bucketCount).fill(0);

  for (const p of points) {
    const idx = Math.floor((p.checked_at - startAt) / bucketSizeMs);
    if (idx < 0 || idx >= bucketCount) continue;
    if (p.status === "up") upCounts[idx] += 1;
    else downCounts[idx] += 1;
  }

  let totalUp = 0;
  let totalChecks = 0;
  const buckets: BucketState[] = new Array(bucketCount);
  for (let i = 0; i < bucketCount; i += 1) {
    const u = upCounts[i];
    const d = downCounts[i];
    totalUp += u;
    totalChecks += u + d;
    if (u === 0 && d === 0) buckets[i] = "unknown";
    else if (d === 0) buckets[i] = "up";
    else if (u === 0) buckets[i] = "down";
    else buckets[i] = "partial";
  }

  const uptimePct = totalChecks === 0 ? null : Math.round((totalUp / totalChecks) * 1000) / 10;
  return { buckets, uptimePct };
}

export function registerUptimeRoutes(app: Express) {
  app.get("/v1/uptime", async (req: Request, res: Response) => {
    if (!req.userProfile) {
      res.status(401).json({ error: "NO_SESSION_TOKEN" });
      return;
    }

    const window = parseWindow(req.query.window);
    const { durationMs, bucketSizeMs } = WINDOWS[window];
    const endAt = Date.now();
    const startAt = endAt - durationMs;
    const bucketCount = Math.floor(durationMs / bucketSizeMs);

    const registry = await loadRegistry();
    const targets = registry.filter((a) => a.enabled && a.environment === "prod");

    const allPoints = getChecksInRange(startAt, endAt);
    const byApp = new Map<string, UptimePoint[]>();
    for (const p of allPoints) {
      let list = byApp.get(p.app_id);
      if (!list) {
        list = [];
        byApp.set(p.app_id, list);
      }
      list.push(p);
    }

    const apps: AppUptime[] = targets.map((a) => {
      const points = byApp.get(a.id) ?? [];
      const { buckets, uptimePct } = aggregateBuckets(points, startAt, bucketSizeMs, bucketCount);
      return {
        id: a.id,
        name: a.name,
        url: a.url,
        category: a.category,
        buckets,
        uptimePct
      };
    });

    res.json({
      meta: { window, startAt, endAt, bucketSizeMs, bucketCount },
      apps
    });
  });
}
