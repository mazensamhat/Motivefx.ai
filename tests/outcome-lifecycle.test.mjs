import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

const outcomes = await readFile(new URL("../apps/site/src/lib/ops/outcomes.ts", import.meta.url), "utf8");
const durable = await readFile(new URL("../apps/site/src/lib/ops/durable.ts", import.meta.url), "utf8");
const record = await readFile(new URL("../apps/site/src/lib/terminal/market-truth/record-from-views.ts", import.meta.url), "utf8");
const vercel = JSON.parse(await readFile(new URL("../apps/site/vercel.json", import.meta.url), "utf8"));
const outcomeRoute = await readFile(new URL("../apps/site/src/app/api/cron/outcomes/route.ts", import.meta.url), "utf8");

async function loadOutcomesModule(prisma) {
  const policy = `
const DAY_MS = 86_400_000;
const OUTCOME_EVALUATOR_VERSION = "MARKET_OUTCOME_V4";
const OUTCOME_SEED_VERSIONS = [OUTCOME_EVALUATOR_VERSION, "MARKET_OUTCOME_V3", "MARKET_OUTCOME_V2", "LEGACY_SIGNAL_V1"];
const RETRYABLE_OUTCOME_PREFIX = "RETRYABLE_MARKET_DATA: ";
function selectCompletedDailyClose() { return null; }
function outcomeDueAt(recordedAtMs, horizonDays) {
  if (!Number.isFinite(recordedAtMs) || recordedAtMs <= 0 || !Number.isInteger(horizonDays) || horizonDays <= 0) return null;
  const dueAt = recordedAtMs + horizonDays * DAY_MS;
  return Number.isSafeInteger(dueAt) && dueAt <= 8.64e15 ? dueAt : null;
}
function classifyObservedReturn(score, entryPrice, outcomePrice) {
  if (!Number.isFinite(score) || score < 0 || score > 100) return null;
  if (!Number.isFinite(entryPrice) || entryPrice <= 0 || !Number.isFinite(outcomePrice) || outcomePrice <= 0) return null;
  const realizedReturnPct = ((outcomePrice - entryPrice) / entryPrice) * 100;
  if (!Number.isFinite(realizedReturnPct)) return null;
  let outcome;
  if (score >= 55) outcome = realizedReturnPct >= 1 ? "CONFIRMED" : realizedReturnPct > -1 ? "PARTIAL" : "REJECTED";
  else if (score <= 45) outcome = realizedReturnPct <= -1 ? "CONFIRMED" : realizedReturnPct < 1 ? "PARTIAL" : "REJECTED";
  else outcome = Math.abs(realizedReturnPct) <= 1 ? "CONFIRMED" : Math.abs(realizedReturnPct) <= 3 ? "PARTIAL" : "REJECTED";
  return { outcome, realizedReturnPct };
}
function summarizeCalibration() { return { buckets: [], evaluated: 0, excludedInvalid: 0, forecastReady: false }; }
`;
  const source = outcomes
    .replace(/import \{ prisma \} from "@motivefx\/database";/, "const prisma = globalThis.__outcomeLifecyclePrisma;")
    .replace(/import\s+\{[\s\S]*?\}\s+from "\.\/outcome-policy";/, policy);
  globalThis.__outcomeLifecyclePrisma = prisma;
  const stripped = stripTypeScriptTypes(source);
  return import(`data:text/javascript;base64,${Buffer.from(stripped).toString("base64")}#${Date.now()}`);
}

test("outcome lifecycle runs automatically and is credential protected", () => {
  assert.deepEqual(vercel.crons.find((row) => row.path === "/api/cron/outcomes"), {path:"/api/cron/outcomes", schedule:"17 * * * *"});
  assert.match(outcomeRoute, /process\.env\.CRON_SECRET/);
  assert.match(outcomeRoute, /authorization/);
  assert.match(outcomeRoute, /Bearer/);
});
test("new outcomes are seeded on V4 with source metadata", () => {
  assert.match(durable,/MARKET_OUTCOME_V4/);
  assert.match(durable,/SOURCE_META/);
  assert.match(durable,/createMany/);
  assert.match(durable,/skipDuplicates:\s*true/);
});
test("outcome evaluator pages past unsupported backlog rows", () => {
  assert.match(outcomes,/MAX_CANDIDATE_SCAN_ROWS/);
  assert.match(outcomes,/cursor:\{id:cursorId\}/);
  assert.match(outcomes,/pending\.length<take/);
});
test("outcome evaluator skips unsupported pages to evaluate later supported rows", async () => {
  const recordedAt = new Date("2026-01-01T00:00:00.000Z");
  const unsupported = Array.from({ length: 500 }, (_, index) => ({
    id: `sports-${index}`,
    symbol: `GAME-${index}`,
    outcome: "PENDING",
    evaluatorVersion: "MARKET_OUTCOME_V4",
    horizonDays: 30,
    predictedScore: 72,
    createdAt: new Date(recordedAt.getTime() + index),
    snapshot: {
      symbol: `GAME-${index}`,
      recordedAt,
      evidenceJson: JSON.stringify([{ id: `opp-betting-${index}` }]),
    },
  }));
  const cryptoRow = {
    id: "crypto-due",
    symbol: "BTC",
    outcome: "PENDING",
    evaluatorVersion: "MARKET_OUTCOME_V4",
    horizonDays: 30,
    predictedScore: 72,
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    snapshot: {
      symbol: "BTC",
      recordedAt,
      evidenceJson: JSON.stringify([{ id: "opp-crypto-btc", market: "crypto" }]),
    },
  };
  const findManyCalls = [];
  const updates = [];
  const prisma = {
    signalOutcome: {
      async findMany(args) {
        findManyCalls.push(args);
        if (args.take === 0) return [];
        return args.cursor ? [cryptoRow] : unsupported;
      },
      async updateMany(args) {
        updates.push(args);
        return { count: 1 };
      },
    },
  };
  const previousFetch = globalThis.fetch;
  const previousCryptoEnabled = process.env.COINGECKO_OUTCOMES_ENABLED;
  const previousFinnhubEnabled = process.env.FINNHUB_HISTORICAL_ENABLED;
  process.env.COINGECKO_OUTCOMES_ENABLED = "true";
  process.env.FINNHUB_HISTORICAL_ENABLED = "false";
  globalThis.fetch = async (url) => ({
    ok: true,
    async json() {
      return {
        market_data: {
          current_price: {
            usd: String(url).includes("31-12-2025") ? 100 : 104,
          },
        },
      };
    },
  });
  try {
    const { evaluatePendingOutcomes } = await loadOutcomesModule(prisma);
    assert.deepEqual(await evaluatePendingOutcomes(1), { evaluated: 1, inconclusive: 0 });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousCryptoEnabled == null) delete process.env.COINGECKO_OUTCOMES_ENABLED;
    else process.env.COINGECKO_OUTCOMES_ENABLED = previousCryptoEnabled;
    if (previousFinnhubEnabled == null) delete process.env.FINNHUB_HISTORICAL_ENABLED;
    else process.env.FINNHUB_HISTORICAL_ENABLED = previousFinnhubEnabled;
    delete globalThis.__outcomeLifecyclePrisma;
  }
  assert.equal(findManyCalls.length, 2);
  assert.deepEqual(findManyCalls[1].cursor, { id: "sports-499" });
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].where, {
    id: "crypto-due",
    outcome: "PENDING",
    evaluatorVersion: "MARKET_OUTCOME_V4",
  });
  assert.equal(updates[0].data.outcome, "CONFIRMED");
  assert.equal(updates[0].data.entryPrice, 100);
  assert.equal(updates[0].data.outcomePrice, 104);
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
