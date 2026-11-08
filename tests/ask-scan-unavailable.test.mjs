import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

// Extract the pure multi-desk orchestration logic so failure/empty semantics
// can be tested without credentials, real user ledgers, or paid providers.
const file = readFileSync(new URL("../apps/site/src/lib/ask-motive/tools.ts", import.meta.url), "utf8");
const start = file.indexOf("export async function toolScanAllPortfolios(userId: string)");
const end = file.indexOf("\nexport async function toolExplainSymbol", start);
assert.ok(start >= 0 && end > start, "the public scan tool must remain testable");
const scanBody = file
  .slice(start, end)
  .replace("export async function toolScanAllPortfolios(userId: string)", "async function toolScanAllPortfolios(userId)")
  .replace("] as const;", "];");
const makeScan = (reader) =>
  new Function("toolAnalyzePortfolio", scanBody + "\nreturn toolScanAllPortfolios;")(reader);

test("all five successful reads can honestly report empty", async () => {
  const scan = await makeScan(async ({ module }) => ({ module, empty: true }))("test");
  assert.equal(scan.desksAttempted, 5);
  assert.equal(scan.desksScanned, 5);
  assert.equal(scan.desksUnavailable, 0);
  assert.equal(scan.desksWithData, 0);
  assert.match(scan.note, /No holdings or open slips found/);
});

test("one rejected saved read is marked unavailable, never empty", async () => {
  const scan = await makeScan(async ({ module }) => {
    if (module === "crypto") throw Error("temporary read failure");
    return { module, empty: true };
  })("test");
  assert.equal(scan.desksScanned, 4);
  assert.equal(scan.desksUnavailable, 1);
  assert.equal(scan.results.find((r) => r.module === "crypto").unavailable, true);
  assert.notEqual(scan.results.find((r) => r.module === "crypto").empty, true);
  assert.doesNotMatch(scan.note, /No holdings or open slips found/);
});

test("five rejected reads cannot become a false no-holdings answer", async () => {
  const scan = await makeScan(async () => { throw Error("pool timeout"); })("test");
  assert.equal(scan.desksScanned, 0);
  assert.equal(scan.desksUnavailable, 5);
  assert.equal(scan.desksWithData, 0);
  assert.ok(scan.results.every((r) => r.unavailable === true && r.empty !== true));
  assert.match(scan.note, /Never infer an unread ledger is empty/);
});

test("mixed populated and unread desks count only successfully read holdings", async () => {
  const scan = await makeScan(async ({ module }) => {
    if (module === "crypto") throw Error("read error");
    if (module === "trades") return { module, empty: false, summary: "one holding" };
    return { module, empty: true };
  })("test");
  assert.equal(scan.desksScanned, 4);
  assert.equal(scan.desksWithData, 1);
  assert.equal(scan.desksUnavailable, 1);
  assert.doesNotMatch(scan.note, /No holdings or open slips found/);
});

test("user-facing whole-book renderer explicitly labels unread desks", () => {
  const runner = readFileSync(new URL("../apps/site/src/lib/ask-motive/run.ts", import.meta.url), "utf8");
  assert.match(runner, /"unavailable" in r && r.unavailable/);
  assert.match(runner, /Saved data was not read/);
});
