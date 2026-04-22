import cron from "node-cron";
import { config } from "../config.js";
import { syncServiceAccountMarkers } from "./keycloak-admin.js";

let started = false;

export function startServiceAccountMarkerScheduler(): void {
  if (started) return;

  if (!config.keycloakAdminPassword) {
    console.warn("[service-account-marker-sync] skipped: missing KEYCLOAK_ADMIN_PASSWORD");
    return;
  }

  started = true;
  const cronExpression = config.keycloakServiceAccountMarkerSyncCron;

  const run = (mode: "initial" | "scheduled"): void => {
    void syncServiceAccountMarkers()
      .then((summary) => {
        console.log(
          `[service-account-marker-sync] ${mode} scan assigned ${summary.assignedMarkers}, `
            + `already marked ${summary.alreadyMarked}, failures ${summary.failed.length}`
        );

        if (summary.failed.length > 0) {
          console.warn(
            `[service-account-marker-sync] failed clients: ${summary.failed
              .map((failure) => `${failure.clientId} (${failure.error})`)
              .join(", ")}`
          );
        }
      })
      .catch((error) => {
        console.error(`[service-account-marker-sync] ${mode} sync failed:`, error);
      });
  };

  run("initial");

  cron.schedule(cronExpression, () => {
    run("scheduled");
  });

  console.log(`[service-account-marker-sync] scheduler started (${cronExpression})`);
}
