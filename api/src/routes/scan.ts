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

  // Unregistered app candidates — admin only
  app.get("/v1/scan/candidates", async (req, res) => {
    if (!req.userProfile?.realmRoles.includes("admin")) {
      res.status(403).json({ error: "FORBIDDEN" });
      return;
    }

    const all = await scanProjects(config.projectsRoot);
    const unregistered = all.filter((c) => !c.matchedRegistryId);

    res.json({
      generatedAt: new Date().toISOString(),
      total: all.length,
      unregisteredCount: unregistered.length,
      candidates: unregistered
    });
  });
}
