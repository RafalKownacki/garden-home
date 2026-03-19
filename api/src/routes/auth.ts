import type { Express } from "express";

export function registerAuthRoutes(app: Express) {
  app.get("/v1/auth/me", (req, res) => {
    if (!req.userProfile) {
      res.status(401).json({ error: "NO_SESSION_TOKEN" });
      return;
    }

    res.json(req.userProfile);
  });
}
