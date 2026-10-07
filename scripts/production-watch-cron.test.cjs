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
  assert.match(
    source,
    /issueCount === 0 \? ["']healthy["'] : ["']attention["']/,
    "persisted run status must honor the database healthy|attention|incident contract"
  );
});

test("Production Watch may self-heal intelligence but never mutates customer or billing state", () => {
  const source = read("apps/site/src/app/api/cron/production-watch/route.ts");

  // Safe automatic remediation: stale intelligence is rebuilt and durability is flushed.
  assert.match(source, /buildHomeBriefing/);
  assert.match(source, /flushSignalEvidencePersistence/);
  assert.match(source, /originalSignalStale/);
  assert.match(source, /originalDnaStale/);
  assert.match(source, /fixedCount/);

  // Customer and commercial state remain outside automatic remediation.
  assert.doesNotMatch(source, /userPortfolio\.(create|update|delete)/);
  assert.doesNotMatch(source, /userBet\.(create|update|delete)/);
  assert.doesNotMatch(source, /userPrediction\.(create|update|delete)/);
  assert.doesNotMatch(source, /stripe|billingProvider|revenueCat/i);
});


test("Health audit UI renders structured production-watch details and fixed counts", () => {
  const source = read("apps/site/src/app/admin/(console)/health-audits/page.tsx");
  assert.match(source, /Array\.isArray\(run\.details\)/);
  assert.match(source, /run\.details\.checks/);
  assert.match(source, /fixed_count/);
  assert.match(source, /remediationPerformed/);
  assert.match(source, /verificationEvidence/);
  assert.match(source, /fixedState/);
  assert.match(source, /cadenceFilter/);
  assert.match(source, /statusFilter/);
  assert.match(source, /URLSearchParams/);
});


test("Client runtime crashes are privacy-minimized, reported, and audited", () => {
  const registry = read("apps/site/src/lib/ops/event-registry.ts");
  const route = read("apps/site/src/app/api/client-error/route.ts");
  const watch = read("apps/site/src/app/api/cron/production-watch/route.ts");
  const webReporter = read("web/src/lib/clientTelemetry.ts");
  const webBoundary = read("web/src/components/TerminalErrorBoundary.tsx");
  const nativeReporter = read("mobile/src/lib/clientTelemetry.ts");
  const nativeBoundary = read("mobile/src/components/ErrorBoundary.tsx");
  const globalError = read("apps/site/src/app/global-error.tsx");

  assert.match(registry, /"client\.error"/);
  assert.match(route, /messageSignature/);
  assert.match(route, /createHash\("sha256"\)/);
  assert.match(route, /Payload too large/);
  assert.match(route, /safeRoute/);
  assert.doesNotMatch(route, /stack\s*:/);
  assert.doesNotMatch(route, /email\s*:/);
  assert.match(watch, /eventName:\s*"client\.error"/);
  assert.match(watch, /client_runtime_errors/);
  assert.match(webReporter, /\/api\/client-error/);
  assert.match(webReporter, /unhandledrejection/);
  assert.match(webBoundary, /reportClientError/);
  assert.match(nativeReporter, /\/client-error/);
  assert.match(nativeBoundary, /reportNativeClientError/);
  assert.match(globalError, /\/api\/client-error/);
});
