import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

const env = {
  session: { user: { id: "qa-user", simulationMarkets: [] } },
  plan: {
    allowedMarkets: ["trades", "crypto", "penny", "predictions", "betting"],
    features: { portfolio_intelligence: true },
  },
  holdings: [],
  saves: [],
  predictions: [],
  bets: [],
  telemetry: [],
  operations: [],
};

class RouteAccessError extends Error {}

function reset(overrides = {}) {
  env.session = { user: { id: "qa-user", simulationMarkets: [] } };
  env.plan = {
    allowedMarkets: ["trades", "crypto", "penny", "predictions", "betting"],
    features: { portfolio_intelligence: true },
  };
  env.holdings = [];
  env.saves = [];
  env.predictions = [];
  env.bets = [];
  env.telemetry = [];
  env.operations = [];
  Object.assign(env, overrides);
}

function jsonRequest(body) {
  return new Request("https://motivefx.test/api/terminal/portfolio/add", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readJson(response) {
  return {
    status: response.status,
    body: await response.json(),
  };
}

function requireMarket(plan, market) {
  if (!plan.allowedMarkets?.includes(market)) throw new RouteAccessError(`Locked ${market}`);
}

function requireMarketOrSim(plan, user, market) {
  if (plan.allowedMarkets?.includes(market) || user.simulationMarkets?.includes(market)) return;
  throw new RouteAccessError(`Locked ${market}`);
}

globalThis.__portfolioAddRouteTest = {
  badRequest: (message) => Response.json({ error: message }, { status: 400 }),
  json: (body) => Response.json(body),
  accessErrorResponse: (err) => Response.json({ error: err.message }, { status: 403 }),
  assertUserMatch: (session, userId) => {
    if (session.user.id !== userId) throw new RouteAccessError("Wrong user");
  },
  requireTerminalSession: async () => ({ ok: true, session: env.session }),
  requireFeature: (plan, feature) => {
    if (!plan.features?.[feature]) throw new RouteAccessError(`Locked ${feature}`);
  },
  requireModule: requireMarket,
  requireModuleOrSim: requireMarketOrSim,
  entitlementsPlanForUser: async () => env.plan,
  loadPortfolio: async () => env.holdings,
  savePortfolio: async (userId, kind, holdings) => {
    env.saves.push({ userId, kind, holdings });
    env.operations.push(`save:${kind}`);
  },
  addPrediction: async (userId, payload) => {
    env.predictions.push({ userId, payload });
    env.operations.push("add:predictions");
    return "prediction-1";
  },
  addBet: async (userId, payload) => {
    env.bets.push({ userId, payload });
    env.operations.push("add:betting");
    return "bet-1";
  },
  recordTelemetryDurable: async (input) => {
    env.telemetry.push(input);
    env.operations.push(`telemetry:${input.desk}`);
    return input;
  },
};

let source = stripTypeScriptTypes(
  await readFile(new URL("../apps/site/src/app/api/terminal/portfolio/add/route.ts", import.meta.url), "utf8")
);
source = source.replace(/import[\s\S]*?from ["'][^"']+["'];/g, "");
source = `const {badRequest,json,accessErrorResponse,assertUserMatch,requireTerminalSession,requireFeature,requireModule,requireModuleOrSim,entitlementsPlanForUser,loadPortfolio,savePortfolio,addPrediction,addBet,recordTelemetryDurable}=globalThis.__portfolioAddRouteTest;\n${source}`;

const { POST } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

test("existing portfolio holdings record deduplicated success telemetry after saving", async () => {
  reset({ holdings: [{ symbol: "aapl", shares: 3 }] });

  const result = await readJson(await POST(jsonRequest({ user_id: "qa-user", kind: "trades", symbol: " aapl " })));

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { saved: true, count: 1, already_present: true, kind: "trades" });
  assert.deepEqual(env.saves, [
    {
      userId: "qa-user",
      kind: "trades",
      holdings: [{ symbol: "AAPL", shares: 3 }],
    },
  ]);
  assert.deepEqual(env.telemetry, [
    {
      eventName: "portfolio.item.added",
      userId: "qa-user",
      product: "motivefx",
      desk: "trades",
      status: "ok",
      sourceClass: "user",
      privacyClass: "internal",
      metadata: { kind: "trades", count: 1, alreadyPresent: true },
    },
  ]);
  assert.deepEqual(env.operations, ["save:trades", "telemetry:trades"]);
});

test("new portfolio holdings record count and already-present metadata", async () => {
  reset();

  const result = await readJson(await POST(jsonRequest({ user_id: "qa-user", kind: "crypto", symbol: " btc " })));

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { saved: true, count: 1, already_present: false, kind: "crypto" });
  assert.deepEqual(env.saves, [
    {
      userId: "qa-user",
      kind: "crypto",
      holdings: [{ symbol: "BTC", shares: 1 }],
    },
  ]);
  assert.equal(env.telemetry.length, 1);
  assert.equal(env.telemetry[0].desk, "crypto");
  assert.deepEqual(env.telemetry[0].metadata, { kind: "crypto", count: 1, alreadyPresent: false });
  assert.deepEqual(env.operations, ["save:crypto", "telemetry:crypto"]);
});

test("prediction saves emit prediction desk telemetry without portfolio writes", async () => {
  reset();

  const result = await readJson(
    await POST(jsonRequest({ user_id: "qa-user", kind: "predictions", symbol: "Fed decision", title: "No cut" }))
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { saved: true, id: "prediction-1", kind: "predictions" });
  assert.deepEqual(env.predictions, [
    {
      userId: "qa-user",
      payload: { market: "Fed decision", category: "signal", pick: "No cut" },
    },
  ]);
  assert.deepEqual(env.saves, []);
  assert.deepEqual(env.telemetry, [
    {
      eventName: "portfolio.item.added",
      userId: "qa-user",
      product: "motivefx",
      desk: "predictions",
      status: "ok",
      sourceClass: "user",
      privacyClass: "internal",
      metadata: { kind: "predictions" },
    },
  ]);
  assert.deepEqual(env.operations, ["add:predictions", "telemetry:predictions"]);
});

test("betting saves emit betting desk telemetry after the bet is recorded", async () => {
  reset();

  const result = await readJson(
    await POST(jsonRequest({ user_id: "qa-user", kind: "betting", symbol: "Leafs @ Bruins", title: "Leafs +1.5" }))
  );

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { saved: true, id: "bet-1", kind: "betting" });
  assert.deepEqual(env.bets, [
    {
      userId: "qa-user",
      payload: { matchup: "Leafs @ Bruins", pick: "Leafs +1.5", sport: "other" },
    },
  ]);
  assert.deepEqual(env.telemetry, [
    {
      eventName: "portfolio.item.added",
      userId: "qa-user",
      product: "motivefx",
      desk: "betting",
      status: "ok",
      sourceClass: "user",
      privacyClass: "internal",
      metadata: { kind: "betting" },
    },
  ]);
  assert.deepEqual(env.operations, ["add:betting", "telemetry:betting"]);
});

for (const kind of ["trades", "predictions", "betting"]) {
  test(`locked ${kind} module does not save or record success telemetry`, async () => {
    reset({ plan: { allowedMarkets: [], features: { portfolio_intelligence: false } } });

    const result = await readJson(await POST(jsonRequest({ user_id: "qa-user", kind, symbol: "NVDA" })));

    assert.equal(result.status, 403);
    assert.deepEqual(env.saves, []);
    assert.deepEqual(env.predictions, []);
    assert.deepEqual(env.bets, []);
    assert.deepEqual(env.telemetry, []);
    assert.deepEqual(env.operations, []);
  });
}
