import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";

class AccessDeniedError extends Error {
  constructor(message = "Access denied") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

class ModuleLockedError extends Error {
  constructor(module) {
    super("Subscribe to unlock this intelligence market.");
    this.name = "ModuleLockedError";
    this.module = module;
  }
}

class FeatureLockedError extends Error {
  constructor(feature) {
    super("Upgrade your plan to unlock Portfolio Intelligence.");
    this.name = "FeatureLockedError";
    this.feature = feature;
  }
}

let env;
const key = "__portfolioAddTelemetryTest";

globalThis[key] = {
  badRequest: (message) => Response.json({ error: message }, { status: 400 }),
  json: (body) => Response.json(body),
  accessErrorResponse(error) {
    if (error instanceof ModuleLockedError) {
      return Response.json(
        {
          detail: {
            code: "module_locked",
            module: error.module,
            message: error.message,
          },
        },
        { status: 403 }
      );
    }
    if (error instanceof FeatureLockedError) {
      return Response.json(
        {
          detail: {
            code: "tier_locked",
            feature: error.feature,
            message: error.message,
          },
        },
        { status: 403 }
      );
    }
    if (error instanceof AccessDeniedError) {
      return Response.json({ error: error.message }, { status: 403 });
    }
    return Response.json({ error: error.message, detail: error.message }, { status: 400 });
  },
  assertUserMatch(session, userId) {
    if (session.user.id !== userId) throw new AccessDeniedError();
  },
  requireTerminalSession: () => env.auth(),
  requireFeature: (...args) => env.requireFeature(...args),
  requireModule: (...args) => env.requireModule(...args),
  requireModuleOrSim: (...args) => env.requireModuleOrSim(...args),
  entitlementsPlanForUser: (...args) => env.planForUser(...args),
  loadPortfolio: (...args) => env.loadPortfolio(...args),
  savePortfolio: (...args) => env.savePortfolio(...args),
  addPrediction: (...args) => env.addPrediction(...args),
  addBet: (...args) => env.addBet(...args),
  recordTelemetryDurable: (...args) => env.recordTelemetryDurable(...args),
};

let source = stripTypeScriptTypes(
  await readFile(
    new URL("../apps/site/src/app/api/terminal/portfolio/add/route.ts", import.meta.url),
    "utf8"
  )
);
source = source.replace(/import[\s\S]*?from ["'][^"']+["'];/g, "");
source = `const { badRequest, json, accessErrorResponse, assertUserMatch, requireTerminalSession, requireFeature, requireModule, requireModuleOrSim, entitlementsPlanForUser, loadPortfolio, savePortfolio, addPrediction, addBet, recordTelemetryDurable } = globalThis.${key};\n${source}`;
const { POST } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);

const user = { id: "user-1", email: "qa@example.invalid" };
const plan = { active: true, allowedMarkets: ["trades", "crypto", "betting", "predictions"] };

function reset(overrides = {}) {
  env = {
    telemetry: [],
    saves: [],
    predictions: [],
    bets: [],
    loaded: [],
    moduleChecks: [],
    featureChecks: [],
    auth: async () => ({ ok: true, session: { user } }),
    planForUser: async () => plan,
    requireModule: (_plan, module) => env.moduleChecks.push(module),
    requireModuleOrSim: (_plan, _user, module) => env.moduleChecks.push(module),
    requireFeature: (_plan, feature) => env.featureChecks.push(feature),
    loadPortfolio: async (userId, kind) => {
      env.loaded.push({ userId, kind });
      return [];
    },
    savePortfolio: async (userId, kind, holdings) => {
      env.saves.push({ userId, kind, holdings });
    },
    addPrediction: async (userId, input) => {
      env.predictions.push({ userId, input });
      return "prediction-1";
    },
    addBet: async (userId, input) => {
      env.bets.push({ userId, input });
      return "bet-1";
    },
    recordTelemetryDurable: async (row) => {
      env.telemetry.push(row);
    },
    ...overrides,
  };
}

function request(body) {
  return new Request("https://motivefx.test/api/terminal/portfolio/add", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test.beforeEach(() => reset());

test("portfolio add records success telemetry after saving a new holding", async () => {
  env.loadPortfolio = async (userId, kind) => {
    env.loaded.push({ userId, kind });
    return [{ symbol: "MSFT", shares: 2 }];
  };

  const response = await POST(request({ user_id: user.id, kind: "trades", symbol: " nvda " }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    saved: true,
    count: 2,
    already_present: false,
    kind: "trades",
  });

  assert.deepEqual(env.moduleChecks, ["trades"]);
  assert.deepEqual(env.featureChecks, ["portfolio_intelligence"]);
  assert.deepEqual(env.saves, [
    {
      userId: user.id,
      kind: "trades",
      holdings: [
        { symbol: "MSFT", shares: 2 },
        { symbol: "NVDA", shares: 1 },
      ],
    },
  ]);
  assert.deepEqual(env.telemetry, [
    {
      eventName: "portfolio.item.added",
      userId: user.id,
      product: "motivefx",
      desk: "trades",
      status: "ok",
      sourceClass: "user",
      privacyClass: "internal",
      metadata: { kind: "trades", count: 2, alreadyPresent: false },
    },
  ]);
});

test("portfolio add records already-present telemetry without duplicating holdings", async () => {
  env.loadPortfolio = async (userId, kind) => {
    env.loaded.push({ userId, kind });
    return [{ symbol: "nvda", shares: 5 }];
  };

  const response = await POST(request({ user_id: user.id, kind: "crypto", symbol: "NVDA" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    saved: true,
    count: 1,
    already_present: true,
    kind: "crypto",
  });

  assert.deepEqual(env.saves, [
    {
      userId: user.id,
      kind: "crypto",
      holdings: [{ symbol: "NVDA", shares: 5 }],
    },
  ]);
  assert.deepEqual(env.telemetry.map((row) => row.metadata), [
    { kind: "crypto", count: 1, alreadyPresent: true },
  ]);
});

test("prediction and betting adds record desk-specific success telemetry", async () => {
  let response = await POST(
    request({
      user_id: user.id,
      kind: "predictions",
      symbol: "Fed cuts rates in December",
      title: "Yes",
    })
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    saved: true,
    id: "prediction-1",
    kind: "predictions",
  });

  response = await POST(
    request({
      user_id: user.id,
      kind: "betting",
      symbol: "Leafs @ Bruins",
      title: "Leafs +1.5",
    })
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    saved: true,
    id: "bet-1",
    kind: "betting",
  });

  assert.deepEqual(env.moduleChecks, ["predictions", "betting"]);
  assert.deepEqual(env.predictions, [
    {
      userId: user.id,
      input: {
        market: "Fed cuts rates in December",
        category: "signal",
        pick: "Yes",
      },
    },
  ]);
  assert.deepEqual(env.bets, [
    {
      userId: user.id,
      input: {
        matchup: "Leafs @ Bruins",
        pick: "Leafs +1.5",
        sport: "other",
      },
    },
  ]);
  assert.deepEqual(
    env.telemetry.map((row) => ({
      desk: row.desk,
      metadata: row.metadata,
      status: row.status,
    })),
    [
      { desk: "predictions", metadata: { kind: "predictions" }, status: "ok" },
      { desk: "betting", metadata: { kind: "betting" }, status: "ok" },
    ]
  );
});

test("locked modules do not save or emit success telemetry", async () => {
  env.requireModule = () => {
    throw new ModuleLockedError("penny");
  };

  const response = await POST(request({ user_id: user.id, kind: "penny", symbol: "QA" }));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    detail: {
      code: "module_locked",
      module: "penny",
      message: "Subscribe to unlock this intelligence market.",
    },
  });
  assert.deepEqual(env.loaded, []);
  assert.deepEqual(env.saves, []);
  assert.deepEqual(env.telemetry, []);
});

test("failed saves are not reported as successful portfolio telemetry", async () => {
  env.savePortfolio = async () => {
    throw new Error("database unavailable");
  };

  const response = await POST(request({ user_id: user.id, kind: "trades", symbol: "NVDA" }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "database unavailable",
    detail: "database unavailable",
  });
  assert.deepEqual(env.telemetry, []);
});
