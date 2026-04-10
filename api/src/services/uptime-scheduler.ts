import cron from "node-cron";
import { runUptimeCheck } from "./uptime-checker.js";

let started = false;

export function startUptimeScheduler(): void {
  if (started) return;
  started = true;

  // Run immediately on startup so the page has data after deploys.
  void runUptimeCheck().catch((err) => {
    console.error("[uptime] initial check failed:", err);
  });

  cron.schedule("*/5 * * * *", () => {
    runUptimeCheck().catch((err) => {
      console.error("[uptime] scheduled check failed:", err);
    });
  });

  console.log("[uptime] scheduler started (every 5 min)");
}
