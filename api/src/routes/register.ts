import type { Express, Request, Response } from "express";
import { verifyRegistrationKey } from "../auth/verify-registration-key.js";
import { triggerAccessRefreshInBackground } from "../services/access-sync-service.js";
import * as store from "../services/registry-store.js";
import { validateRegistrationBody } from "../services/registry-validation.js";

export function registerRegistrationRoutes(app: Express): void {
  app.post("/v1/registry/register", verifyRegistrationKey, async (req: Request, res: Response) => {
    const result = validateRegistrationBody(req.body);
    if (!result.ok) {
      res.status(400).json({ error: result.error, field: result.field });
      return;
    }

    const { created } = await store.upsert(result.entry);
    if (result.entry.accessSync?.mode === "pull_snapshot_v1") {
      triggerAccessRefreshInBackground(result.entry.id);
    }

    res.status(created ? 201 : 200).json({
      created,
      id: result.entry.id,
      lastRegisteredAt: result.entry.lastRegisteredAt,
    });
  });
}
