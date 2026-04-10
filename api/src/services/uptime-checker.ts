import { Agent, fetch as undiciFetch } from "undici";
import { loadRegistry } from "./registry-store.js";
import { insertCheck, deleteOlderThan, type UptimeStatus } from "./uptime-store.js";

const REQUEST_TIMEOUT_MS = 10_000;
const RETENTION_DAYS = 30;

// Monitoring checks reachability, not cert chain — accept self-signed.
const insecureDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

function classify(httpCode: number): UptimeStatus {
  if (httpCode >= 200 && httpCode < 400) return "up";
  if (httpCode === 401 || httpCode === 403) return "up";
  return "down";
}

async function checkOne(appId: string, url: string): Promise<void> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await undiciFetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": "garden-home-uptime/1.0" },
      dispatcher: insecureDispatcher
    });
    const latency = Date.now() - startedAt;
    insertCheck({
      app_id: appId,
      checked_at: startedAt,
      status: classify(response.status),
      http_code: response.status,
      latency_ms: latency,
      error: null
    });
  } catch (err) {
    const latency = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);
    insertCheck({
      app_id: appId,
      checked_at: startedAt,
      status: "down",
      http_code: null,
      latency_ms: latency,
      error: message.slice(0, 200)
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function runUptimeCheck(): Promise<void> {
  const registry = await loadRegistry();
  const targets = registry.filter((app) => app.enabled && app.environment === "prod");

  await Promise.all(targets.map((app) => checkOne(app.id, app.url)));

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  deleteOlderThan(cutoff);
}
