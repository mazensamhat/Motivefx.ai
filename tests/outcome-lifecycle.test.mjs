import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

const outcomes = await readFile(new URL("../apps/site/src/lib/ops/outcomes.ts", import.meta.url), "utf8");
const durable = await readFile(new URL("../apps/site/src/lib/ops/durable.ts", import.meta.url), "utf8");
const record = await readFile(new URL("../apps/site/src/lib/terminal/market-truth/record-from-views.ts", import.meta.url), "utf8");
const vercel = JSON.parse(await readFile(new URL("../apps/site/vercel.json", import.meta.url), "utf8"));

test("outcome lifecycle runs automatically and is credential protected", () => {
  assert.ok(Array.isArray(vercel.crons));
  assert.ok(vercel.crons.some((cron) => cron.path === "/api/cron/outcomes" && cron.schedule === "17 * * * *"));
});
test("new outcomes are seeded on V4 with source metadata", () => {
  assert.match(durable,/MARKET_OUTCOME_V4/);
  assert.match(durable,/SOURCE_META/);
});
test("signal evidence preserves desk market identity", () => {
  for (const value of ["crypto","sports","predictions","stocks"]) assert.match(record,new RegExp(value));
  assert.match(record,/sourceReference/);
});
test("market outcomes use ground truth providers and never substitute signal movement", () => {
  assert.match(outcomes,/CoinGecko historical USD daily snapshot/);
  assert.match(outcomes,/Finnhub completed daily close/);
  assert.doesNotMatch(outcomes,/nextBull|directionAgreed/);
  assert.match(outcomes,/unsupportedMarkets:\["sports","predictions"\]/);
});
