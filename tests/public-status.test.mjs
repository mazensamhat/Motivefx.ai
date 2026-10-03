import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../apps/site/src/app/status/page.tsx", import.meta.url), "utf8");
const lib = await readFile(new URL("../apps/site/src/lib/public-status.ts", import.meta.url), "utf8");
const footer = await readFile(new URL("../apps/site/src/components/marketing/site-footer.tsx", import.meta.url), "utf8");
const nav = await readFile(new URL("../apps/site/src/components/marketing/site-nav.tsx", import.meta.url), "utf8");

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
