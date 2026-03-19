import type { Express } from "express";

export function registerHealthRoute(app: Express) {
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "garden-home-api"
    });
  });
}
