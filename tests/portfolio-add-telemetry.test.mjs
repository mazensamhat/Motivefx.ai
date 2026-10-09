import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

class AccessDeniedError extends Error {}
class ModuleLockedError extends Error {
  constructor(module) {
    super("Subscribe to unlock this intelligence market.");
    this.module = module;
  }
}
class FeatureLockedError extends Error {
  constructor(feature) {
    super("Upgrade your plan to unlock this feature.");
    this.feature = feature;
  }
}

const state = {
  userId: "user-1",
  auth: null,
  plan: null,
  holdings: [],
  savedPortfolios: [],
  predictions: [],
  bets: [],
  telemetry: [],
};

function reset(overrides = {}) {
  state.userId = overrides.userId ?? "user-1";
  state.auth =
    overrides.auth ??
    (async () => ({
      ok: true,
      session: {
        user: {
          id: state.userId,
          simTrialStartedAt: new Date(Date.now() - 60_000),
          simBankroll: 1000,
        },
      },
    }));
  state.plan =
    overrides.plan ??
    (async () => ({
      allowedMarkets: ["trades", "crypto", "penny", "betting", "predictions"],
      features: { portfolio_intelligence: true },
    }));
  state.holdings = overrides.holdings ?? [];
  state.savedPortfolios = [];
  state.predictions = [];
  state.bets = [];
  state.telemetry = [];
}

function hasModule(plan, module) {
  return Array.isArray(plan.allowedMarkets) && plan.allowedMarkets.includes(module);
}

function apiJson(data, status = 200, init) {
  return Response.json(data, { status, headers: init?.headers });
}

globalThis.__portfolioAddRouteTest = {
  badRequest: (message) => Response.json({ error: message }, { status: 400 }),
  json: apiJson,
  accessErrorResponse: (err) => {
    if (err instanceof ModuleLockedError) {
      return Response.json(
        { detail: { code: "module_locked", module: err.module, message: err.message } },
        { status: 403 },
      );
    }
    if (err instanceof FeatureLockedError) {
      return Response.json(
        { detail: { code: "tier_locked", feature: err.feature, message: err.message } },
        { status: 403 },
      );
    }
    if (err instanceof AccessDeniedError) return Response.json({ error: err.message }, { status: 403 });
    return Response.json({ error: err.message, detail: err.message }, { status: 400 });
  },
  assertUserMatch: (session, userId) => {
    if (session.user.id !== userId) throw new AccessDeniedError("Access denied");
  },
  requireTerminalSession: () => state.auth(),
  requireFeature: (plan, feature) => {
    if (!plan.features?.[feature]) throw new FeatureLockedError(feature);
  },
  requireModule: (plan, module) => {
    if (!hasModule(plan, module)) throw new ModuleLockedError(module);
  },
  requireModuleOrSim: (plan, user, module) => {
    if (hasModule(plan, module)) return;
    const simStarted = user.simTrialStartedAt instanceof Date ? user.simTrialStartedAt.getTime() : 0;
    if ((module === "betting" || module === "predictions") && Date.now() - simStarted < 3 * 86_400_000) return;
    throw new ModuleLockedError(module);
  },
  entitlementsPlanForUser: () => state.plan(),
  loadPortfolio: async () => state.holdings.map((holding) => ({ ...holding })),
  savePortfolio: async (userId, module, holdings) => {
    state.savedPortfolios.push({ userId, module, holdings });
  },
  addPrediction: async (userId, data) => {
    const id = `prediction-${state.predictions.length + 1}`;
    state.predictions.push({ id, userId, data });
    return id;
  },
  addBet: async (userId, data) => {
    const id = `bet-${state.bets.length + 1}`;
    state.bets.push({ id, userId, data });
    return id;
  },
  recordTelemetryDurable: async (input) => {
    state.telemetry.push(input);
    return { ...input, eventId: `event-${state.telemetry.length}` };
  },
};

let routeSource = stripTypeScriptTypes(
  await readFile(new URL("../apps/site/src/app/api/terminal/portfolio/add/route.ts", import.meta.url), "utf8"),
);
routeSource = routeSource.replace(/import[\s\S]*?from ["'][^"']+["'];\n?/g, "");
routeSource =
  "const {badRequest,json,accessErrorResponse,assertUserMatch,requireTerminalSession,requireFeature,requireModule,requireModuleOrSim,entitlementsPlanForUser,loadPortfolio,savePortfolio,addPrediction,addBet,recordTelemetryDurable}=globalThis.__portfolioAddRouteTest;\n" +
  routeSource;
const { POST } = await import(`data:text/javascript;base64,${Buffer.from(routeSource).toString("base64")}`);

function request(body) {
  return new Request("https://qa.example.test/api/terminal/portfolio/add", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

test("portfolio holdings emit success telemetry with normalized count and duplicate state", async () => {
  reset({ holdings: [{ symbol: "nvda", shares: 3 }] });

  const response = await POST(request({ user_id: "user-1", kind: "trades", symbol: " nvda " }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { saved: true, count: 1, already_present: true, kind: "trades" });
  assert.deepEqual(state.savedPortfolios, [
    { userId: "user-1", module: "trades", holdings: [{ symbol: "NVDA", shares: 3 }] },
  ]);
  assert.deepEqual(state.telemetry, [
    {
      eventName: "portfolio.item.added",
      userId: "user-1",
      product: "motivefx",
      desk: "trades",
      status: "ok",
      sourceClass: "user",
      privacyClass: "internal",
      metadata: { kind: "trades", count: 1, alreadyPresent: true },
    },
  ]);
});

test("new portfolio holdings report the expanded count before returning success", async () => {
  reset({ holdings: [{ symbol: "BTC", shares: 1 }] });

  const response = await POST(request({ user_id: "user-1", kind: "crypto", symbol: "eth" }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { saved: true, count: 2, already_present: false, kind: "crypto" });
  assert.deepEqual(state.savedPortfolios[0], {
    userId: "user-1",
    module: "crypto",
    holdings: [{ symbol: "BTC", shares: 1 }, { symbol: "ETH", shares: 1 }],
  });
  assert.deepEqual(state.telemetry[0].metadata, { kind: "crypto", count: 2, alreadyPresent: false });
});

test("prediction saves emit portfolio-add telemetry on the prediction desk", async () => {
  reset();

  const response = await POST(
    request({ user_id: "user-1", kind: "predictions", symbol: "Fed cut in June?", title: "Yes" }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { saved: true, id: "prediction-1", kind: "predictions" });
  assert.deepEqual(state.predictions, [
    {
      id: "prediction-1",
      userId: "user-1",
      data: { market: "Fed cut in June?", category: "signal", pick: "Yes" },
    },
  ]);
  assert.deepEqual(state.telemetry, [
    {
      eventName: "portfolio.item.added",
      userId: "user-1",
      product: "motivefx",
      desk: "predictions",
      status: "ok",
      sourceClass: "user",
      privacyClass: "internal",
      metadata: { kind: "predictions" },
    },
  ]);
});

test("betting saves emit portfolio-add telemetry for the betting module", async () => {
  reset();

  const response = await POST(
    request({ user_id: "user-1", kind: "betting", symbol: "Leafs @ Bruins", title: "Leafs +1.5" }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { saved: true, id: "bet-1", kind: "betting" });
  assert.deepEqual(state.bets, [
    {
      id: "bet-1",
      userId: "user-1",
      data: { matchup: "Leafs @ Bruins", pick: "Leafs +1.5", sport: "other" },
    },
  ]);
  assert.deepEqual(state.telemetry, [
    {
      eventName: "portfolio.item.added",
      userId: "user-1",
      product: "motivefx",
      desk: "betting",
      status: "ok",
      sourceClass: "user",
      privacyClass: "internal",
      metadata: { kind: "betting" },
    },
  ]);
});

test("locked portfolio modules do not save holdings or emit success telemetry", async () => {
  reset({ plan: async () => ({ allowedMarkets: ["trades"], features: { portfolio_intelligence: true } }) });

  const response = await POST(request({ user_id: "user-1", kind: "crypto", symbol: "ETH" }));
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.deepEqual(body.detail, {
    code: "module_locked",
    module: "crypto",
    message: "Subscribe to unlock this intelligence market.",
  });
  assert.deepEqual(state.savedPortfolios, []);
  assert.deepEqual(state.telemetry, []);
});
