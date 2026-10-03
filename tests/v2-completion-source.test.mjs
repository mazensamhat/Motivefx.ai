import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
const read = (p) => readFile(new URL("../" + p, import.meta.url), "utf8");
const [home, sidebar, complete, trust, platform, phase, outcome, portfolio, close, prefs, vercel] = await Promise.all([
  read("web/src/components/MotiveV2Home.tsx"), read("web/src/components/ModuleSidebar.tsx"),
  read("web/src/components/MotiveV2Completion.tsx"), read("web/src/components/MotiveV2TrustLayer.tsx"),
  read("web/src/components/PlatformSetupModal.tsx"), read("web/src/components/Phase2IntelPanels.tsx"),
  read("apps/site/src/lib/ops/outcomes.ts"), read("apps/site/src/app/api/intel/portfolio-intelligence/route.ts"),
  read("apps/site/src/app/api/intel/market-close/route.ts"), read("apps/site/src/lib/terminal/intel-prefs.ts"),
  read("apps/site/vercel.json"),
]);

test("Simple and Pro disclosure are persistent and explicit", () => {
  assert.match(home, /motivefx_disclosure/); assert.match(home, />Simple</); assert.match(home, />Pro</);
});
test("Discover, Portfolio Intelligence and Market Close are navigable", () => {
  for (const id of ["v2-discover", "v2-portfolio-intelligence", "v2-market-close"]) assert.match(sidebar, new RegExp(id));
  for (const title of ["Cross-market scanner", "Portfolio Intelligence", "MARKET CLOSE"]) assert.match(complete, new RegExp(title));
});
test("Since You Were Away is evidence-safe", () => {
  assert.match(complete, /SINCE YOUR LAST BRIEF/); assert.match(complete, /Baseline established/); assert.match(complete, /motivefx_v2_last_brief/);
});
test("deep-intelligence callbacks are wired to review and Ask Motive", () => {
  assert.match(home, /onInspectTheme/); assert.match(home, /onInspectGraphLink/);
});
test("custom Watch Agents include builder, background semantics and history", () => {
  assert.match(trust, /Create Watch Agent/); assert.match(trust, /every hour/); assert.match(trust, /Recent agent history/);
});
test("external integrations are clearly read-only handoffs", () => {
  assert.match(platform, /handoffs/); assert.match(platform, /does not request broker credentials/); assert.match(platform, /synchronize holdings/);
});
test("Motive Signal theme UI does not label signal as probability percent", () => {
  assert.match(phase, /Evidence confidence/); assert.match(phase, /view\.probability}\/100/);
});
test("cross-market outcome engine excludes unsupported generic event signals", () => {
  assert.match(outcome, /MARKET_OUTCOME_V4/); assert.match(outcome, /CoinGecko/); assert.match(outcome, /Generic evidence-strength signal/);
});
test("whole-book API spans all five markets without pretending count concentration is value exposure", () => {
  for (const token of ["loadPortfolio", "listBets", "listPredictions", "marketCounts"]) assert.match(portfolio, new RegExp(token));
  assert.match(portfolio, /count-based/);
});
test("Market Close is recorded-signal context, not realized performance", () => {
  assert.match(close, /signalSnapshot/); assert.match(close, /not realized performance/);
});
test("Watch Agent preferences survive partial preference updates", () => assert.match(prefs, /prefs\.watchAgents \?\? existing\.watchAgents/));
test("Vercel schedules outcome resolution and Watch Agents", () => {
  const parsed = JSON.parse(vercel); assert.ok(parsed.crons.some((c) => c.path === "/api/cron/outcomes")); assert.ok(parsed.crons.some((c) => c.path === "/api/cron/watch-agents"));
});
