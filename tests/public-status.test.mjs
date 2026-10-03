import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

const page = await readFile(new URL("../apps/site/src/app/status/page.tsx", import.meta.url), "utf8");
const lib = await readFile(new URL("../apps/site/src/lib/public-status.ts", import.meta.url), "utf8");
const footer = await readFile(new URL("../apps/site/src/components/marketing/site-footer.tsx", import.meta.url), "utf8");
const nav = await readFile(new URL("../apps/site/src/components/marketing/site-nav.tsx", import.meta.url), "utf8");

const db = { $queryRaw: async () => { throw new Error("test database not configured"); } };
globalThis[Symbol.for("motivefx.public-status-test.db")] = db;

assert.ok(lib.includes('import { prisma } from "@motivefx/database";'));
const moduleSource = lib.replace(
  'import { prisma } from "@motivefx/database";',
  'const prisma = globalThis[Symbol.for("motivefx.public-status-test.db")];'
);
const { buildPublicStatusSnapshot } = await import(
  "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(moduleSource)).toString("base64")
);

function sqlText(strings) {
  return Array.from(strings).join(" ");
}

function componentById(snapshot, id) {
  const component = snapshot.components.find((item) => item.id === id);
  assert.ok(component, `missing component ${id}`);
  return component;
}

test("status page is linked from site navigation and footer", () => {
  assert.match(nav, /href: "\/status"/);
  assert.match(footer, /href="\/status"/);
});

test("status source distinguishes unknown telemetry from operational", () => {
  assert.match(lib, /"unknown"/);
  assert.match(page, /History collection in progress/);
  assert.match(page, /Missing telemetry is shown as Checking/);
});

test("status page exposes monitored MotiveFX systems", () => {
  for (const label of ["Website & Login", "Market Data & Feeds", "Portfolios & Saved Items", "Ask Motive AI", "Signals & Opportunity Radar", "Sports & Predictions", "Mobile Apps", "Integrations & Providers"]) {
    assert.match(lib, new RegExp(label.replace(/[&]/g, "\\&")));
  }
});

test("status history reads MotiveFX audit snapshots only", () => {
  assert.match(lib, /eventName" = 'system_status_snapshot'/);
  assert.match(lib, /"product" = 'motivefx'/);
  assert.match(lib, /"cadence":"daily"/);
});

test("snapshot ranks audit status, incidents, and daily history deterministically", async () => {
  const latestAt = new Date("2026-10-03T08:00:00.000Z");
  const newerDaily = new Date("2026-10-02T00:00:00.000Z");
  const olderDaily = new Date("2026-10-01T00:00:00.000Z");
  const queries = [];

  db.$queryRaw = async (strings) => {
    const sql = sqlText(strings);
    queries.push(sql);
    if (sql.includes("SELECT 1")) return [{ ok: 1 }];
    if (sql.includes("OpsTelemetryEvent") && sql.includes('LIMIT 1') && !sql.includes('"cadence":"daily"')) {
      return [{
        observedAt: latestAt,
        metadataJson: JSON.stringify({
          componentStatus: {
            web: "operational",
            feeds: "degraded",
            ai: "partial outage",
            mobile: "invented",
          },
        }),
      }];
    }
    if (sql.includes("OpsTelemetryEvent") && sql.includes('"cadence":"daily"')) {
      return [
        { observedAt: newerDaily, metadataJson: JSON.stringify({ componentStatus: { web: "operational", feeds: "degraded", ai: "operational" } }) },
        { observedAt: olderDaily, metadataJson: JSON.stringify({ componentStatus: { web: "degraded", feeds: "major_outage", ai: "operational" } }) },
      ];
    }
    if (sql.includes("OpsIncidentRecord")) {
      return [
        { id: "inc-ai", severity: "CRITICAL", domain: "model", title: "Ask Motive generation outage", description: "Model responses failed", status: "open", lastSeen: latestAt },
        { id: "inc-feeds", severity: "HIGH", domain: "provider", title: "Market data feed lagging", description: "Odds feed stale", status: "open", lastSeen: latestAt },
        { id: "inc-low", severity: "LOW", domain: "web", title: "Login warning", description: "Auth notice", status: "open", lastSeen: latestAt },
      ];
    }
    throw new Error(`unexpected query: ${sql}`);
  };

  const snapshot = await buildPublicStatusSnapshot();
  const active = Object.fromEntries(snapshot.activeIssues.map((issue) => [issue.componentId, issue.status]));

  assert.equal(snapshot.source, "audit");
  assert.equal(snapshot.checkedAt, latestAt.toISOString());
  assert.equal(snapshot.historyAvailable, true);
  assert.equal(snapshot.overall, "major_outage");
  assert.equal(componentById(snapshot, "web").status, "operational");
  assert.equal(componentById(snapshot, "feeds").status, "partial_outage");
  assert.equal(componentById(snapshot, "ai").status, "major_outage");
  assert.equal(componentById(snapshot, "mobile").status, "unknown");
  assert.deepEqual(componentById(snapshot, "feeds").history, ["major_outage", "degraded"]);
  assert.deepEqual(componentById(snapshot, "ai").history, ["operational", "operational"]);
  assert.deepEqual(active, { feeds: "partial_outage", ai: "major_outage" });
  assert.equal(queries.length, 4);
});

test("database readiness failure reports customer-impacting fallback issues", async () => {
  db.$queryRaw = async (strings) => {
    const sql = sqlText(strings);
    if (sql.includes("SELECT 1")) throw new Error("database unavailable");
    return [];
  };

  const snapshot = await buildPublicStatusSnapshot();
  const active = Object.fromEntries(snapshot.activeIssues.map((issue) => [issue.componentId, issue.status]));

  assert.equal(snapshot.source, "readiness");
  assert.equal(snapshot.historyAvailable, false);
  assert.equal(snapshot.overall, "major_outage");
  assert.equal(componentById(snapshot, "web").status, "major_outage");
  assert.equal(componentById(snapshot, "portfolio").status, "partial_outage");
  assert.equal(active.web, "major_outage");
  assert.equal(active.portfolio, "partial_outage");
});

test("audit query failure stays unknown instead of marking every component healthy", async () => {
  db.$queryRaw = async (strings) => {
    const sql = sqlText(strings);
    if (sql.includes("SELECT 1")) return [{ ok: 1 }];
    throw new Error("telemetry unavailable");
  };

  const snapshot = await buildPublicStatusSnapshot();

  assert.equal(snapshot.source, "readiness");
  assert.equal(snapshot.overall, "unknown");
  assert.equal(componentById(snapshot, "web").status, "operational");
  assert.equal(componentById(snapshot, "feeds").status, "unknown");
  assert.equal(componentById(snapshot, "ai").status, "unknown");
  assert.deepEqual(snapshot.activeIssues, []);
});
