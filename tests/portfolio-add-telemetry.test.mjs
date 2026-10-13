import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

let env;

class AccessDeniedError extends Error {
  status = 403;
}

class ModuleLockedError extends Error {
  status = 403;
}

class FeatureLockedError extends Error {
  status = 403;
}

const routeEnv = {
  badRequest: (message) => Response.json({ error: message }, { status: 400 }),
  json: (body) => Response.json(body),
  accessErrorResponse: (error) =>
    Response.json({ error: error instanceof Error ? error.message : "request failed" }, { status: error?.status ?? 403 }),
  assertUserMatch: (...args) => env.assertUserMatch(...args),
  requireTerminalSession: () => env.requireTerminalSession(),
  requireFeature: (...args) => env.requireFeature(...args),
  requireModule: (...args) => env.requireModule(...args),
  requireModuleOrSim: (...args) => env.requireModuleOrSim(...args),
  entitlementsPlanForUser: (...args) => env.entitlementsPlanForUser(...args),
  loadPortfolio: (...args) => env.loadPortfolio(...args),
  savePortfolio: (...args) => env.savePortfolio(...args),
  addPrediction: (...args) => env.addPrediction(...args),
  addBet: (...args) => env.addBet(...args),
  recordTelemetryDurable: (...args) => env.recordTelemetryDurable(...args),
};

globalThis.__portfolioAddRouteTest = routeEnv;

let routeSource = stripTypeScriptTypes(
  await readFile(new URL("../apps/site/src/app/api/terminal/portfolio/add/route.ts", import.meta.url), "utf8")
);
routeSource = routeSource.replace(/import[\s\S]*?from ["'][^"']+["'];/g, "");
routeSource =
  "const { badRequest, json, accessErrorResponse, assertUserMatch, requireTerminalSession, requireFeature, requireModule, requireModuleOrSim, entitlementsPlanForUser, loadPortfolio, savePortfolio, addPrediction, addBet, recordTelemetryDurable } = globalThis.__portfolioAddRouteTest;\n" +
  routeSource;

const { POST } = await import(`data:text/javascript;base64,${Buffer.from(routeSource).toString("base64")}`);

function resetEnv(overrides = {}) {
  env = {
    session: { user: { id: "user-1", email: "qa@example.invalid" } },
    plan: { allowedMarkets: ["trades", "crypto", "penny", "predictions", "betting"] },
    currentHoldings: [],
    lockedModules: new Set(),
    lockedSimModules: new Set(),
    lockedFeature: false,
    saveFails: false,
    predictionFails: false,
    betFails: false,
    order: [],
    saveCalls: [],
    predictionCalls: [],
    betCalls: [],
    telemetry: [],
    moduleChecks: [],
    moduleOrSimChecks: [],
    featureChecks: [],
    requireTerminalSession: async () => ({ ok: true, session: env.session }),
    assertUserMatch: (session, userId) => {
      if (session.user.id !== userId) throw new AccessDeniedError("User mismatch");
    },
    entitlementsPlanForUser: async () => env.plan,
    requireModule: (_plan, module) => {
      env.moduleChecks.push(module);
      if (env.lockedModules.has(module)) throw new ModuleLockedError("Module locked");
    },
    requireModuleOrSim: (_plan, _user, module) => {
      env.moduleOrSimChecks.push(module);
      if (env.lockedSimModules.has(module)) throw new ModuleLockedError("Module locked");
    },
    requireFeature: (_plan, feature) => {
      env.featureChecks.push(feature);
      if (env.lockedFeature) throw new FeatureLockedError("Feature locked");
    },
    loadPortfolio: async (userId, kind) => {
      env.loadCalls = [...(env.loadCalls ?? []), { userId, kind }];
      return env.currentHoldings;
    },
    savePortfolio: async (userId, kind, next) => {
      env.order.push(`save:${kind}`);
      env.saveCalls.push({ userId, kind, next });
      if (env.saveFails) throw new Error("portfolio write failed");
    },
    addPrediction: async (userId, prediction) => {
      env.order.push("prediction");
      env.predictionCalls.push({ userId, prediction });
      if (env.predictionFails) throw new Error("prediction write failed");
      return "prediction-1";
    },
    addBet: async (userId, bet) => {
      env.order.push("bet");
      env.betCalls.push({ userId, bet });
      if (env.betFails) throw new Error("bet write failed");
      return "bet-1";
    },
    recordTelemetryDurable: async (row) => {
      env.order.push(`telemetry:${row.desk}`);
      env.telemetry.push(row);
    },
    ...overrides,
  };
}

function addRequest(body) {
  return new Request("https://motive.test/api/terminal/portfolio/add", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ user_id: "user-1", ...body }),
  });
}

test("holdings telemetry is emitted after saving new and existing positions", async () => {
  resetEnv({ currentHoldings: [{ symbol: "AAPL", shares: 2 }] });
  const existing = await POST(addRequest({ kind: "trades", symbol: " aapl " }));

  assert.equal(existing.status, 200);
  assert.deepEqual(await existing.json(), { saved: true, count: 1, already_present: true, kind: "trades" });
  assert.deepEqual(env.saveCalls[0], {
    userId: "user-1",
    kind: "trades",
    next: [{ symbol: "AAPL", shares: 2 }],
  });
  assert.deepEqual(env.order, ["save:trades", "telemetry:trades"]);
  assert.deepEqual(env.telemetry[0], {
    eventName: "portfolio.item.added",
    userId: "user-1",
    product: "motivefx",
    desk: "trades",
    status: "ok",
    sourceClass: "user",
    privacyClass: "internal",
    metadata: { kind: "trades", count: 1, alreadyPresent: true },
  });

  resetEnv();
  const created = await POST(addRequest({ kind: "crypto", symbol: " eth " }));

  assert.equal(created.status, 200);
  assert.deepEqual(await created.json(), { saved: true, count: 1, already_present: false, kind: "crypto" });
  assert.deepEqual(env.saveCalls[0].next, [{ symbol: "ETH", shares: 1 }]);
  assert.deepEqual(env.order, ["save:crypto", "telemetry:crypto"]);
  assert.deepEqual(env.telemetry[0].metadata, { kind: "crypto", count: 1, alreadyPresent: false });
});

test("prediction and betting adds emit desk-specific telemetry after durable writes", async () => {
  resetEnv();
  const prediction = await POST(addRequest({ kind: "predictions", symbol: "BTC > 100K", title: "Bull case" }));

  assert.equal(prediction.status, 200);
  assert.deepEqual(await prediction.json(), { saved: true, id: "prediction-1", kind: "predictions" });
  assert.deepEqual(env.predictionCalls, [
    {
      userId: "user-1",
      prediction: { market: "BTC > 100K", category: "signal", pick: "Bull case" },
    },
  ]);
  assert.deepEqual(env.order, ["prediction", "telemetry:predictions"]);
  assert.deepEqual(env.telemetry[0], {
    eventName: "portfolio.item.added",
    userId: "user-1",
    product: "motivefx",
    desk: "predictions",
    status: "ok",
    sourceClass: "user",
    privacyClass: "internal",
    metadata: { kind: "predictions" },
  });

  resetEnv();
  const bet = await POST(addRequest({ kind: "betting", symbol: "LAL vs BOS" }));

  assert.equal(bet.status, 200);
  assert.deepEqual(await bet.json(), { saved: true, id: "bet-1", kind: "betting" });
  assert.deepEqual(env.betCalls, [
    {
      userId: "user-1",
      bet: { matchup: "LAL vs BOS", pick: "LAL vs BOS", sport: "other" },
    },
  ]);
  assert.deepEqual(env.order, ["bet", "telemetry:betting"]);
  assert.deepEqual(env.telemetry[0].desk, "betting");
  assert.deepEqual(env.telemetry[0].metadata, { kind: "betting" });
});

test("locked modules never save or emit successful portfolio-add telemetry", async () => {
  resetEnv({ lockedFeature: true });
  const portfolio = await POST(addRequest({ kind: "penny", symbol: "mmat" }));

  assert.equal(portfolio.status, 403);
  assert.deepEqual(env.saveCalls, []);
  assert.deepEqual(env.telemetry, []);

  resetEnv({ lockedSimModules: new Set(["predictions"]) });
  const prediction = await POST(addRequest({ kind: "predictions", symbol: "Fed cut" }));

  assert.equal(prediction.status, 403);
  assert.deepEqual(env.predictionCalls, []);
  assert.deepEqual(env.telemetry, []);
});

test("failed portfolio, prediction, and betting writes do not emit success telemetry", async () => {
  resetEnv({ saveFails: true });
  const portfolio = await POST(addRequest({ kind: "crypto", symbol: "SOL" }));

  assert.equal(portfolio.status, 403);
  assert.deepEqual(env.order, ["save:crypto"]);
  assert.deepEqual(env.telemetry, []);

  resetEnv({ predictionFails: true });
  const prediction = await POST(addRequest({ kind: "predictions", symbol: "Election market" }));

  assert.equal(prediction.status, 403);
  assert.deepEqual(env.order, ["prediction"]);
  assert.deepEqual(env.telemetry, []);

  resetEnv({ betFails: true });
  const bet = await POST(addRequest({ kind: "betting", symbol: "NYK vs MIA" }));

  assert.equal(bet.status, 403);
  assert.deepEqual(env.order, ["bet"]);
  assert.deepEqual(env.telemetry, []);
});
