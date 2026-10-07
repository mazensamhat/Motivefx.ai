const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("Production Watch cron is protected by CRON_SECRET", () => {
  const source = read("apps/site/src/app/api/cron/production-watch/route.ts");
  assert.match(source, /process\.env\.CRON_SECRET/);
  assert.match(source, /authorization/);
  assert.match(source, /Bearer/);
  assert.match(source, /status:\s*401/);
});

test("Production Watch runs hourly and records all four audit cadences", () => {
  const config = JSON.parse(read("apps/site/vercel.json"));
  const row = config.crons.find((entry) => entry.path === "/api/cron/production-watch");
  assert.ok(row);
  assert.match(row.schedule, /^\d+ \* \* \* \*$/);

  const source = read("apps/site/src/app/api/cron/production-watch/route.ts");
  for (const cadence of ["hourly", "daily", "weekly", "monthly"]) {
    assert.match(source, new RegExp(`["']${cadence}["']`));
  }
  assert.match(source, /OpsProductionWatchRun/);
  assert.match(source, /ON CONFLICT \(id\) DO UPDATE/);
});

test("Production Watch audits are read-only outside their own Ops ledger", () => {
  const source = read("apps/site/src/app/api/cron/production-watch/route.ts");
  assert.doesNotMatch(source, /userPortfolio\.(create|update|delete)/);
  assert.doesNotMatch(source, /userBet\.(create|update|delete)/);
  assert.doesNotMatch(source, /userPrediction\.(create|update|delete)/);
  assert.doesNotMatch(source, /stripe|billingProvider|revenueCat/i);
});
