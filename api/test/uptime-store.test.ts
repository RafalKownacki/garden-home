import assert from "node:assert/strict";
import { test } from "node:test";
import Database from "better-sqlite3";
import { createUptimeStore } from "../src/services/uptime-store.js";

test("uptime store inserts, queries ranges, returns latest status, and cleans old rows", () => {
  const store = createUptimeStore({ db: new Database(":memory:") });

  store.insertCheck({
    app_id: "first",
    checked_at: 1000,
    status: "up",
    http_code: 200,
    latency_ms: 25,
    error: null,
  });
  store.insertCheck({
    app_id: "first",
    checked_at: 2000,
    status: "down",
    http_code: 500,
    latency_ms: 40,
    error: null,
  });
  store.insertCheck({
    app_id: "second",
    checked_at: 3000,
    status: "up",
    http_code: 204,
    latency_ms: 10,
    error: null,
  });

  assert.deepEqual(
    store.getChecksInRange(1500, 3000).map((row) => ({
      appId: row.app_id,
      checkedAt: row.checked_at,
      status: row.status,
    })),
    [
      { appId: "first", checkedAt: 2000, status: "down" },
      { appId: "second", checkedAt: 3000, status: "up" },
    ]
  );

  assert.deepEqual([...store.getLatestStatusPerApp().entries()].sort(), [
    ["first", "down"],
    ["second", "up"],
  ]);

  assert.equal(store.deleteOlderThan(2500), 2);
  assert.deepEqual([...store.getLatestStatusPerApp().entries()], [["second", "up"]]);

  store.close();
});
