import type { Express } from "express";
import {
  handleKeycloakCallback,
  handleKeycloakLogin,
  handleKeycloakLogout
} from "../auth/keycloak-session.js";

export function registerAuthRoutes(app: Express) {
  app.get("/v1/auth/login", async (req, res) => {
    await handleKeycloakLogin(req, res);
  });

  app.get("/v1/auth/callback", async (req, res) => {
    await handleKeycloakCallback(req, res);
  });

  app.get("/v1/auth/logout", (req, res) => {
    handleKeycloakLogout(req, res);
  });

  app.post("/v1/auth/logout", (req, res) => {
    handleKeycloakLogout(req, res);
  });

  app.get("/v1/auth/profile", (req, res) => {
    if (!req.userProfile) {
      res.status(401).json({ error: "NO_SESSION_TOKEN" });
      return;
    }

    res.json(req.userProfile);
  });

  app.get("/v1/auth/me", (req, res) => {
    if (!req.userProfile) {
      res.status(401).json({ error: "NO_SESSION_TOKEN" });
      return;
    }

    res.json(req.userProfile);
  });
}
