import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSiteModule } from "./load-site-module.mjs";

const provenance = await loadSiteModule("../packages/shared/src/provenance.ts");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadRoute(overrides = {}) {
  const calls = [];
  const feeds = {
    fetchWhaleAlerts: async (mode) => {
      calls.push(["fetchWhaleAlerts", mode]);
      return [
        {
          asset: "BTC",
          amountUsd: 1_540_000_000,
          note: "CoinGecko 24h volume proxy",
          sourceType: "DERIVED",
          timestamp: "2026-10-13T12:00:00.000Z",
        },
        {
          asset: "ETH",
          amountUsd: 42_000_000,
          direction: "exchange inflow",
          sourceType: "LIVE",
          timestamp: "2026-10-13T12:01:00.000Z",
        },
        {
          asset: "SOL",
          amountUsd: 9_000_000,
          direction: "cold storage",
          sourceType: "LIVE",
          timestamp: "2026-10-13T12:02:00.000Z",
        },
      ];
    },
    scanUnusualOptions: (mode) => {
      calls.push(["scanUnusualOptions", mode]);
      return [
        { symbol: "NVDA", type: "call", note: "Vol/OI spike", timestamp: "2026-10-13T12:03:00.000Z" },
        { symbol: "TSLA", type: "put", note: "Defensive flow", timestamp: "2026-10-13T12:04:00.000Z" },
        { symbol: "AAPL", type: "call", note: "Extra row", timestamp: "2026-10-13T12:05:00.000Z" },
      ];
    },
    fetchLineMoves: async () => {
      calls.push(["fetchLineMoves"]);
      return [
        { matchup: "Leafs @ Bruins", openingLine: "+1.5", currentLine: "+1", timestamp: "2026-10-13T12:06:00.000Z" },
        { matchup: "Lakers @ Knicks", openingLine: "-2", currentLine: "-3", timestamp: "2026-10-13T12:07:00.000Z" },
        { matchup: "Extra @ Row", openingLine: "1", currentLine: "2", timestamp: "2026-10-13T12:08:00.000Z" },
      ];
    },
    scanPennyMovers: (mode) => {
      calls.push(["scanPennyMovers", mode]);
      return [
        { symbol: "SNDL", changePct: 12.4, note: "Volume spike", timestamp: "2026-10-13T12:09:00.000Z" },
        { symbol: "AMC", changePct: 8.1, note: "Momentum", timestamp: "2026-10-13T12:10:00.000Z" },
        { symbol: "OPEN", changePct: 9.6, note: "Extra row", timestamp: "2026-10-13T12:11:00.000Z" },
      ];
    },
    ...overrides.feeds,
  };
  const marketTruth = {
    resolveFeedDataMode: async (request) => {
      calls.push(["resolveFeedDataMode", request.headers.get("user-agent")]);
      return "APP_REVIEW";
    },
    getDataMode: () => "PRODUCTION",
    ...overrides.marketTruth,
  };

  return loadSiteModule("../apps/site/src/app/api/live-feed/route.ts", {
    "@/lib/api": { json: (data, status = 200) => ({ status, body: data }) },
    "../../../../../../packages/shared/src/provenance": provenance,
    "@/lib/terminal/feeds": feeds,
    "@/lib/terminal/market-truth": marketTruth,
  }).then((route) => ({ route, calls }));
}

test("live feed propagates request-scoped data mode and labels volume proxies without transfer language", async () => {
  const { route, calls } = await loadRoute();

  const response = await route.GET(new Request("https://motivefx.test/api/live-feed", {
    headers: { "user-agent": "MotiveFXNative/1.0" },
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body.meta), {
    dataMode: "APP_REVIEW",
    signalDataMode: "PRODUCTION",
  });
  assert.deepEqual(calls, [
    ["resolveFeedDataMode", "MotiveFXNative/1.0"],
    ["fetchWhaleAlerts", "APP_REVIEW"],
    ["scanUnusualOptions", "APP_REVIEW"],
    ["fetchLineMoves"],
    ["scanPennyMovers", "APP_REVIEW"],
  ]);

  const [btc, eth] = response.body.events;
  assert.equal(btc.type, "crypto");
  assert.match(btc.message, /^BTC 24h trading volume \$1\.5B \u2014 CoinGecko 24h volume proxy$/);
  assert.doesNotMatch(btc.message, /reported transfer|wallet|on-chain/i);
  assert.match(eth.message, /^ETH reported transfer \$42M \u2014 exchange inflow$/);
});

test("live feed caps each provider family to two ticker events", async () => {
  const { route } = await loadRoute();

  const response = await route.GET(new Request("https://motivefx.test/api/live-feed"));

  assert.equal(response.body.events.length, 8);
  assert.deepEqual(
    plain(response.body.events.map((event) => event.message)),
    [
      "BTC 24h trading volume $1.5B \u2014 CoinGecko 24h volume proxy",
      "ETH reported transfer $42M \u2014 exchange inflow",
      "Unusual $NVDA CALL activity \u2014 Vol/OI spike",
      "Unusual $TSLA PUT activity \u2014 Defensive flow",
      "Line move: Leafs @ Bruins opened +1.5 \u2192 now +1",
      "Line move: Lakers @ Knicks opened -2 \u2192 now -3",
      "$SNDL pink slip 12.4% \u2014 Volume spike",
      "$AMC pink slip 8.1% \u2014 Momentum",
    ]
  );
});
