import test from "node:test";
import assert from "node:assert/strict";

import { resolvePrincipalType } from "../src/services/service-account-utils.ts";

test("resolvePrincipalType prefers explicit service claim", () => {
  assert.equal(
    resolvePrincipalType({
      principalType: "service",
      realmRoles: [],
      username: "jan.kowalski",
    }),
    "service",
  );
});

test("resolvePrincipalType detects service accounts from realm role", () => {
  assert.equal(
    resolvePrincipalType({
      realmRoles: ["grdn-service-account", "viewer"],
      username: "svc.assets",
    }),
    "service",
  );
});

test("resolvePrincipalType falls back to username heuristics only during migration", () => {
  assert.equal(
    resolvePrincipalType({
      realmRoles: [],
      username: "service-account-assetsmcp",
    }),
    "service",
  );
  assert.equal(
    resolvePrincipalType({
      realmRoles: ["viewer"],
      username: "anna.nowak",
    }),
    "human",
  );
});
