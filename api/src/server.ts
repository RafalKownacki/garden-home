import cors from "cors";
import express from "express";
import { requireAuth } from "./auth/verify-token.js";
import { config } from "./config.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerAppsRoutes } from "./routes/apps.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerScanRoutes } from "./routes/scan.js";

const app = express();

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: false
  })
);
app.use(express.json());

registerHealthRoute(app);
app.use(requireAuth);
registerAuthRoutes(app);
registerAppsRoutes(app);
registerScanRoutes(app);
registerAdminRoutes(app);

app.listen(config.port, () => {
  console.log(`garden-home-api listening on :${config.port}`);
});
