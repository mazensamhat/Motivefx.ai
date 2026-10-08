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

  const webApi = read("web/src/lib/api.ts");
  const nativeApi = read("mobile/src/lib/api.ts");
  assert.match(webApi, /terminal\.network/);
  assert.match(webApi, /terminal\.api/);
  assert.match(nativeApi, /native\.network/);
  assert.match(nativeApi, /native\.api/);
});


test("Ops exposes privacy-minimized Client Errors triage", () => {
  const nav = read("apps/site/src/components/admin/ops-nav.ts");
  const page = read("apps/site/src/app/admin/(console)/client-errors/page.tsx");

  assert.match(nav, /\/admin\/client-errors/);
  assert.match(page, /eventName\" = 'client\.error'/);
  assert.match(page, /messageSignature/);
  assert.match(page, /errorName/);
  assert.match(page, /platform/);
  assert.match(page, /surface/);
  assert.match(page, /occurrences/);
  assert.match(page, /first_seen/);
  assert.match(page, /last_seen/);
  assert.doesNotMatch(page, /userId/);
  assert.doesNotMatch(page, /email/);
  assert.doesNotMatch(page, /stack/);
});


test("Recurring anonymous client errors escalate to Ops incidents without customer identity", () => {
  const source = read("apps/site/src/app/api/cron/production-watch/route.ts");
  assert.match(source, /HAVING COUNT\(\*\) >= 3/);
  assert.match(source, /client-error-watch/);
  assert.match(source, /upsertIncident/);
  assert.match(source, /messageSignature/);
  assert.match(source, /\/admin\/client-errors/);
  assert.doesNotMatch(source, /client-error.*userId/i);
  assert.doesNotMatch(source, /client-error.*email/i);
});

test("Production Watch only auto-resolves its own client-error incidents", () => {
  const source = read("apps/site/src/app/api/cron/production-watch/route.ts");
  assert.match(source, /source:\s*"client-error-watch"/);
  assert.match(source, /opsIncidentRecord\.updateMany/);
  assert.match(source, /status:\s*"resolved"/);
  assert.match(source, /activeClientIncidentIds/);
  assert.doesNotMatch(source, /opsIncidentRecord\.updateMany\(\{\s*data:/);
});

test("Production Watch separates provider telemetry from config health", () => {
  const source = read("apps/site/src/app/api/cron/production-watch/route.ts");
  assert.match(source, /provider_telemetry/);
  assert.match(source, /OpsTelemetryEvent/);
  assert.match(source, /provider\/configuration flags/);
  assert.match(source, /configuration only, not upstream provider success/);
  assert.match(source, /failure rate of at least 10%/);
});

test("Core provider fetches emit durable telemetry", () => {
  const feeds = read("apps/site/src/lib/terminal/feeds/index.ts");
  const telemetry = read("apps/site/src/lib/ops/telemetry-envelope.ts");
  assert.match(telemetry, /recordTelemetryDurable/);
  for (const provider of ["finnhub", "coingecko", "coinstats", "sharp_api", "the_odds_api", "polymarket_gamma"]) {
    assert.match(feeds, new RegExp(`recordProviderResult\\([\\s\\S]*?"${provider}"`));
  }
  assert.match(feeds, /provider\.request\.completed/);
  assert.match(feeds, /provider\.request\.failed/);
});

test("Provider telemetry aliases match Ops provider IDs", () => {
  const durable = read("apps/site/src/lib/ops/durable.ts");
  assert.match(durable, /POLYMARKET_GAMMA:\s*"POLYMARKET"/);
  assert.match(durable, /THE_ODDS_API:\s*"ODDS_API"/);
  assert.match(durable, /SHARPAPI:\s*"SHARP_API"/);
  assert.match(durable, /providerTelemetryKey\(r\.provider\)/);
});

test("Production Watch never reports a meaningless zero-feed denominator", () => {
  const source = read("apps/site/src/app/api/cron/production-watch/route.ts");
  assert.match(source, /localConfigFeedMap/);
  assert.match(source, /healthFeedMap/);
  assert.match(source, /server environment fallback/);
  assert.match(source, /feedConfigSource/);
  assert.match(source, /FINNHUB_API_KEY/);
  assert.match(source, /OPENAI_API_KEY/);
});
