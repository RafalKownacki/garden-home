import type { Express } from "express";
import type { ScanReportResponse } from "../types/apps.js";
import { config } from "../config.js";
import { scanProjects } from "../services/scan-projects.js";

export function registerScanRoutes(app: Express) {
  app.get("/v1/scan/report", async (req, res) => {
    if (!req.userProfile) {
      res.status(401).json({ error: "NO_SESSION_TOKEN" });
      return;
    }

    const hasScanAccess = config.scanReportRealmRoles.some((role) =>
      req.userProfile?.realmRoles.includes(role)
    );
    if (!hasScanAccess) {
      res.status(403).json({ error: "FORBIDDEN" });
      return;
    }

    const candidates = await scanProjects(config.projectsRoot);
    const response: ScanReportResponse = {
      generatedAt: new Date().toISOString(),
      projectsRoot: config.projectsRoot,
      count: candidates.length,
      candidates
    };

    res.json(response);
  });
}
