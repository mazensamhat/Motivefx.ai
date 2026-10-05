const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("Watch Agent cron is protected by CRON_SECRET", () => {
  const source = read("apps/site/src/app/api/cron/watch-agents/route.ts");
  assert.match(source, /process\.env\.CRON_SECRET/);
  assert.match(source, /authorization/);
  assert.match(source, /Bearer/);
  assert.match(source, /status:\s*401/);
});

test("Watch Agent cron is hourly and distinct from outcome evaluation", () => {
  const config = JSON.parse(read("apps/site/vercel.json"));
  const watch = config.crons.find((row) => row.path === "/api/cron/watch-agents");
  const outcomes = config.crons.find((row) => row.path === "/api/cron/outcomes");
  assert.ok(watch);
  assert.ok(outcomes);
  assert.match(watch.schedule, /^\d+ \* \* \* \*$/);
  assert.notEqual(watch.schedule, outcomes.schedule);
});

test("Watch Agents persist when unrelated Intel preferences are saved", () => {
  const source = read("apps/site/src/lib/terminal/intel-prefs.ts");
  assert.match(source, /watchAgents:\s*prefs\.watchAgents\s*\?\?\s*existing\.watchAgents/);
});

test("scheduled Watch Agents remain alert-only", () => {
  const source = read("apps/site/src/app/api/cron/watch-agents/route.ts");
  assert.match(source, /upsertAlerts/);
  assert.doesNotMatch(source, /placeTrade|executeTrade|placeBet|executeBet|brokerCredential|transactionSync/);
});
