import path from "node:path";
import cors from "cors";
import express from "express";
import { requireAuth } from "./auth/verify-token.js";
import { config } from "./config.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerAppsRoutes } from "./routes/apps.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerLessonsRoutes } from "./routes/lessons.js";
import { registerRegistrationRoutes } from "./routes/register.js";
import { registerScanRoutes } from "./routes/scan.js";
import { registerUptimeRoutes } from "./routes/uptime.js";
import { LESSONS_ROOT } from "./services/lessons-store.js";
import { startAccessSyncScheduler } from "./services/access-sync-scheduler.js";
import { startServiceAccountMarkerScheduler } from "./services/service-account-marker-scheduler.js";
import { startUptimeScheduler } from "./services/uptime-scheduler.js";

const app = express();

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: false
  })
);
app.use(express.json());

registerHealthRoute(app);
registerRegistrationRoutes(app);
app.use(requireAuth);
registerAuthRoutes(app);
registerAppsRoutes(app);
registerScanRoutes(app);
registerAdminRoutes(app);
registerUptimeRoutes(app);
registerLessonsRoutes(app);

const ALLOWED_LESSON_ASSET_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
app.use(
  "/v1/lessons/static",
  (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    if (!ALLOWED_LESSON_ASSET_EXT.has(ext)) {
      res.status(404).end();
      return;
    }
    next();
  },
  express.static(LESSONS_ROOT, { fallthrough: false, index: false })
);

app.listen(config.port, () => {
  console.log(`garden-home-api listening on :${config.port}`);
  startAccessSyncScheduler();
  startServiceAccountMarkerScheduler();
  startUptimeScheduler();
});
