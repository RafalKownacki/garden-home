import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeStoredRegistrationRecord,
  validateRegistrationBody,
} from "../src/services/registry-validation.js";

const validRegistration = {
  id: "sample-app",
  name: " Sample App ",
  description: "Example",
  url: "https://sample.grdn.pl",
  environment: "prod",
  access: [{ source: "realm", anyRoles: ["admin"] }],
};

test("validateRegistrationBody accepts a valid manifest and trims the name", () => {
  const result = validateRegistrationBody(validRegistration);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.entry.name, "Sample App");
  assert.equal(result.entry.lastRegisteredAt !== undefined, true);
});

test("validateRegistrationBody requires access rules or access sync", () => {
  const result = validateRegistrationBody({
    ...validRegistration,
    access: [],
  });

  assert.deepEqual(result, {
    ok: false,
    error: "ACCESS_CONFIGURATION_REQUIRED",
    field: "accessSync",
  });
});

test("validateRegistrationBody rejects invalid URLs, role rules, and access sync config", () => {
  assert.deepEqual(validateRegistrationBody({ ...validRegistration, url: "http://sample.grdn.pl" }), {
    ok: false,
    error: "INVALID_URL",
    field: "url",
  });

  assert.deepEqual(
    validateRegistrationBody({
      ...validRegistration,
      access: [{ source: "realm", anyRoles: ["admin", 123] }],
    }),
    {
      ok: false,
      error: "INVALID_ACCESS_RULE",
      field: "access",
    }
  );

  assert.deepEqual(
    validateRegistrationBody({
      ...validRegistration,
      accessSync: { mode: "pull_snapshot_v1", url: "http://sample.grdn.pl/snapshot" },
    }),
    {
      ok: false,
      error: "INVALID_ACCESS_SYNC",
      field: "accessSync",
    }
  );
});

test("normalizeStoredRegistrationRecord keeps legacy tolerant file-loading behavior", () => {
  const normalized = normalizeStoredRegistrationRecord({
    ...validRegistration,
    name: " Runtime App ",
    access: [
      { source: "realm", anyRoles: ["admin"] },
      { source: "client", clientId: "", anyRoles: ["viewer"] },
    ],
    accessSync: { mode: "pull_snapshot_v1", url: "http://invalid.local/snapshot" },
    lastRegisteredAt: "2026-05-10T00:00:00.000Z",
  });

  assert.equal(normalized?.name, "Runtime App");
  assert.deepEqual(normalized?.access, [{ source: "realm", anyRoles: ["admin"] }]);
  assert.equal(normalized?.accessSync, undefined);
  assert.equal(normalized?.lastRegisteredAt, "2026-05-10T00:00:00.000Z");
});
