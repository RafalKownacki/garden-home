import type { Express } from "express";
import { listAppsForUser } from "../services/apps-service.js";

export function registerAppsRoutes(app: Express) {
  app.get("/v1/apps", (req, res) => {
    if (!req.userProfile) {
      res.status(401).json({ error: "NO_SESSION_TOKEN" });
      return;
    }

    const apps = listAppsForUser(req.userProfile);
    res.json({
      count: apps.length,
      apps
    });
  });
}
