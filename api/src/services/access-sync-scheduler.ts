import cron from "node-cron";
import { refreshAllAccessSnapshots } from "./access-sync-service.js";

let started = false;

export function startAccessSyncScheduler(): void {
  if (started) return;
  started = true;

  void refreshAllAccessSnapshots().catch((error) => {
    console.error("[access-sync] initial refresh failed:", error);
  });

  cron.schedule(configuredCron(), () => {
    refreshAllAccessSnapshots().catch((error) => {
      console.error("[access-sync] scheduled refresh failed:", error);
    });
  });

  console.log(`[access-sync] scheduler started (${configuredCron()})`);
}

function configuredCron(): string {
  return "*/10 * * * *";
}
