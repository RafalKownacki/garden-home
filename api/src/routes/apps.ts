import type { Express } from "express";
import { listAppsForUser } from "../services/apps-service.js";
import { listUsersWithAppAccess } from "../services/app-access-listing.js";
import * as registryStore from "../services/registry-store.js";

export function registerAppsRoutes(app: Express) {
  app.get("/v1/apps", async (req, res) => {
    if (!req.userProfile) {
      res.status(401).json({ error: "NO_SESSION_TOKEN" });
      return;
    }

    const apps = await listAppsForUser(req.userProfile);
    res.json({
      count: apps.length,
      apps
    });
  });

  app.get("/v1/apps/:id/access", async (req, res) => {
    if (!req.userProfile) {
      res.status(401).json({ error: "NO_SESSION_TOKEN" });
      return;
    }

    if (!req.userProfile.realmRoles.includes("superadmin")) {
      res.status(403).json({ error: "FORBIDDEN" });
      return;
    }

    const entry = await registryStore.getById(req.params.id);
    if (!entry) {
      res.status(404).json({ error: "NOT_FOUND" });
      return;
    }

    try {
      const { source, users } = await listUsersWithAppAccess(entry);
      res.json({
        appId: entry.id,
        name: entry.name,
        source,
        count: users.length,
        users,
      });
    } catch (error) {
      console.error("app access listing error:", error);
      res.status(500).json({ error: "ACCESS_LISTING_FAILED" });
    }
  });
}
