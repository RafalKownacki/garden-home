import test from "node:test";
import assert from "node:assert/strict";
import type { AppRegistryEntry, UserAccessProfile } from "../../shared/app-types.js";
import { selectAppsForUser } from "../src/services/apps-service.js";

function createUser(): UserAccessProfile {
  return {
    userId: "u-1",
    username: "marcin",
    displayName: "Marcin",
    principalType: "human",
    realmRoles: ["admin"],
    clientRoles: {},
  };
}

function createApp(params: {
  id: string;
  lastRegisteredAt: string;
  visibleInHome?: boolean;
  enabled?: boolean;
}): AppRegistryEntry {
  return {
    id: params.id,
    name: params.id,
    description: params.id,
    url: `https://${params.id}.grdn.pl`,
    environment: "prod",
    enabled: params.enabled ?? true,
    visibleInHome: params.visibleInHome ?? true,
    lastRegisteredAt: params.lastRegisteredAt,
    access: [{ source: "realm", anyRoles: ["admin"] }],
  };
}

test("listAppsForUser keeps stale legacy apps visible when access is allowed", async (t) => {
  const staleApp = createApp({
    id: "system-rezerwacji",
    lastRegisteredAt: "2026-04-15T10:00:00.000Z",
  });
  const hiddenApp = createApp({
    id: "hidden-app",
    lastRegisteredAt: "2026-04-15T10:00:00.000Z",
    visibleInHome: false,
  });
  const apps = selectAppsForUser({
    registry: [staleApp, hiddenApp],
    statusMap: new Map([[staleApp.id, "up"]]),
    visibilityMap: new Map(),
    user: createUser(),
    now: Date.parse("2026-04-17T13:00:00.000Z"),
  });

  assert.deepEqual(
    apps.map((app) => app.id),
    [staleApp.id]
  );
  assert.equal(apps[0]?.uptimeStatus, "up");
});
