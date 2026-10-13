import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

const testState = {
  portfolios: [],
  signalRows: [],
  dnaRows: [],
  bets: [],
  predictions: [],
  watchlist: [],
  alerts: [],
  signalQueries: [],
  alertQueries: [],
};

globalThis.__motiveIntelDashboardTest = {
  prisma: {
    userPortfolio: {
      findMany: async () => testState.portfolios,
    },
    signalSnapshot: {
      findMany: async (query = {}) => {
        testState.signalQueries.push(query);
        return testState.signalRows;
      },
    },
    marketDnaSnapshot: {
      findMany: async () => testState.dnaRows,
    },
    intelAlert: {
      findMany: async (query = {}) => {
        testState.alertQueries.push(query);
        return testState.alerts;
      },
    },
  },
  listBets: async () => testState.bets,
  listPredictions: async () => testState.predictions,
  listWatchlist: async () => testState.watchlist,
};

let source = stripTypeScriptTypes(
  await readFile(new URL("../apps/site/src/lib/terminal/intelligence-dashboard.ts", import.meta.url), "utf8")
);
source = source.replace(/import[\s\S]*?from ["'][^"']+["'];/g, "");
source =
  "const {prisma,listBets,listPredictions,listWatchlist}=globalThis.__motiveIntelDashboardTest;\n" +
  source;

const {
  buildPortfolioIntelligence,
  buildDiscovery,
  buildSinceAway,
  inferSignalMarket,
} = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

function resetState() {
  testState.portfolios = [];
  testState.signalRows = [];
  testState.dnaRows = [];
  testState.bets = [];
  testState.predictions = [];
  testState.watchlist = [];
  testState.alerts = [];
  testState.signalQueries = [];
  testState.alertQueries = [];
}

function signal(symbol, motiveSignal, recordedAt, extras = {}) {
  return {
    symbol,
    motiveSignal,
    confidence: extras.confidence ?? 80,
    stance: extras.stance ?? "would_watch",
    evidenceJson: extras.evidenceJson ?? "[]",
    signalEvidenceJson: extras.signalEvidenceJson ?? "",
    evidenceCount: extras.evidenceCount ?? 0,
    signalEvidenceCount: extras.signalEvidenceCount ?? 0,
    engineVersion: extras.engineVersion ?? "test",
    recordedAt: new Date(recordedAt),
  };
}

test("market inference prefers recorded evidence identity before symbol heuristics", () => {
  assert.equal(
    inferSignalMarket({
      symbol: "AAPL",
      evidenceJson: JSON.stringify([{ market: "crypto", id: "opp-stock-conflict" }]),
    }),
    "crypto"
  );
  assert.equal(inferSignalMarket({ symbol: "BTCUSD", evidenceJson: JSON.stringify([{ id: "opp-crypto-btc" }]) }), "crypto");
  assert.equal(inferSignalMarket({ symbol: "Leafs @ Bruins", evidenceJson: JSON.stringify([{ id: "opp-betting-nhl" }]) }), "sports");
  assert.equal(inferSignalMarket({ symbol: "NVDA", evidenceJson: "not-json" }), "stocks");
  assert.equal(inferSignalMarket({ symbol: "leafs @ bruins", evidenceJson: "[]" }), "unknown");
});

test("portfolio intelligence enriches holdings without counting simulated or settled exposure", async () => {
  resetState();
  testState.portfolios = [
    { module: "crypto", holdingsJson: JSON.stringify([{ symbol: "btc", amount: 1.25, avg_cost: 61000 }]) },
    { module: "trades", holdingsJson: JSON.stringify([{ symbol: "NVDA", shares: 3, avg_cost: 740 }]) },
    { module: "trades", holdingsJson: "malformed historical json" },
  ];
  testState.signalRows = [
    signal("BTC", 91.26, "2026-10-05T12:00:00Z", {
      confidence: 88.88,
      signalEvidenceJson: JSON.stringify([{ provider: "CoinGecko", group: "market_momentum" }]),
    }),
    signal("NVDA", 67, "2026-10-05T12:00:00Z"),
    signal("BTC", 75, "2026-10-04T12:00:00Z"),
  ];
  testState.dnaRows = [
    { asset: "BTC", primaryDriversJson: JSON.stringify(["Liquidity", { label: "Macro" }]), recordedAt: new Date() },
    { asset: "BTC", primaryDriversJson: JSON.stringify(["Duplicate older snapshot ignored"]), recordedAt: new Date(0) },
    { asset: "NVDA", primaryDriversJson: JSON.stringify([{ name: "AI Capex" }, "Liquidity"]), recordedAt: new Date() },
  ];
  testState.bets = [
    { id: "open-real", status: "open", is_simulation: false },
    { id: "open-sim", status: "open", is_simulation: true },
    { id: "settled-real", status: "settled", is_simulation: false },
  ];
  testState.predictions = [
    { id: "open-prediction", status: "open", is_simulation: false },
    { id: "sim-prediction", status: "open", is_simulation: true },
  ];
  testState.watchlist = [{ symbol: "AAPL" }, { symbol: "BTC" }];

  const dashboard = await buildPortfolioIntelligence("user-1");

  assert.equal(dashboard.holdingsCount, 2);
  assert.equal(dashboard.openBetCount, 1);
  assert.equal(dashboard.openPredictionCount, 1);
  assert.equal(dashboard.watchlistCount, 2);
  assert.equal(dashboard.totalTracked, 4);
  assert.deepEqual(
    dashboard.moduleMix.map((row) => [row.module, row.count]),
    [["crypto", 1], ["trades", 1], ["betting", 1], ["predictions", 1]]
  );
  assert.deepEqual(dashboard.sports.map((bet) => bet.id), ["open-real"]);
  assert.deepEqual(dashboard.predictions.map((prediction) => prediction.id), ["open-prediction"]);

  const btc = dashboard.assets.find((asset) => asset.symbol === "BTC");
  assert.equal(btc.quantity, 1.25);
  assert.equal(btc.motiveSignal, 91.3);
  assert.equal(btc.evidenceConfidence, 88.9);
  assert.equal(btc.signalChange, 16.3);
  assert.deepEqual(btc.evidence, ["CoinGecko: market momentum"]);
  assert.equal(dashboard.attention[0].symbol, "BTC");
  assert.deepEqual(dashboard.commonDrivers, [
    { driver: "Liquidity", count: 2 },
    { driver: "Macro", count: 1 },
    { driver: "AI Capex", count: 1 },
  ]);
});

test("discovery marks user-relevant signals first while preserving market identity", async () => {
  resetState();
  testState.portfolios = [{ module: "crypto", holdingsJson: JSON.stringify([{ symbol: "btc" }]) }];
  testState.watchlist = [{ symbol: "NVDA" }];
  testState.signalRows = [
    signal("TSLA", 99, "2026-10-05T12:00:00Z", { evidenceJson: JSON.stringify([{ market: "stocks" }]) }),
    signal("BTC", 80, "2026-10-05T12:00:00Z", { evidenceJson: JSON.stringify([{ id: "opp-crypto-btc" }]) }),
    signal("NVDA", 70, "2026-10-05T12:00:00Z", { evidenceJson: JSON.stringify([{ market: "stocks" }]) }),
    signal("BTC", 60, "2026-10-04T12:00:00Z"),
  ];

  const discovery = await buildDiscovery("user-1");

  assert.deepEqual(discovery.items.map((item) => [item.symbol, item.relevant, item.market]), [
    ["BTC", true, "crypto"],
    ["NVDA", true, "stocks"],
    ["TSLA", false, "stocks"],
  ]);
  assert.equal(discovery.items[0].delta, 20);
});

test("since-away requests a bounded replay window and serializes returned alerts", async (t) => {
  resetState();
  const realNow = Date.now;
  t.after(() => {
    Date.now = realNow;
  });
  Date.now = () => new Date("2026-10-05T12:00:00Z").getTime();
  testState.signalRows = [
    signal("BTC", 62, "2026-10-05T11:00:00Z", { evidenceJson: JSON.stringify([{ id: "opp-crypto-btc" }]) }),
    signal("BTC", 50, "2026-10-04T11:00:00Z"),
  ];
  testState.alerts = [
    {
      id: "alert-1",
      module: "crypto",
      symbol: "BTC",
      title: "Signal moved",
      body: "BTC moved",
      confidence: 72,
      createdAt: new Date("2026-10-05T10:00:00Z"),
    },
  ];

  const result = await buildSinceAway("user-1", "2026-01-01T00:00:00Z");
  const signalWindow = testState.signalQueries.at(-1).where.recordedAt.gt;
  const alertWindow = testState.alertQueries.at(-1).where.createdAt.gt;

  assert.equal(result.since, "2026-09-05T12:00:00.000Z");
  assert.equal(signalWindow.toISOString(), result.since);
  assert.equal(alertWindow.toISOString(), result.since);
  assert.deepEqual(result.changes.map((change) => [change.symbol, change.market, change.delta]), [["BTC", "crypto", 12]]);
  assert.deepEqual(result.alerts.map((alert) => [alert.id, alert.createdAt]), [["alert-1", "2026-10-05T10:00:00.000Z"]]);
  assert.match(result.summary, /1 notable signal update\(s\) and 1 alert\(s\)/);
});
