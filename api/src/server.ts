import cors from "cors";
import express from "express";
import { requireAuth } from "./auth/verify-token.js";
import { config } from "./config.js";
import { registerAppsRoutes } from "./routes/apps.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerHealthRoute } from "./routes/health.js";

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

app.listen(config.port, () => {
  console.log(`garden-home-api listening on :${config.port}`);
});
