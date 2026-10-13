import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";

const harnessKey = "__motiveWatchAgentsCronTest";
const harness = {
  active: {},
  prisma: {
    userIntelPref: {
      findMany: (...args) => harness.active.prisma.userIntelPref.findMany(...args),
    },
  },
  buildHomeBriefing: (...args) => harness.active.buildHomeBriefing(...args),
  evaluateWatchAgents: (...args) => harness.active.evaluateWatchAgents(...args),
  normalizePrefs: (...args) => harness.active.normalizePrefs(...args),
  upsertAlerts: (...args) => harness.active.upsertAlerts(...args),
  flushSignalEvidencePersistence: (...args) => harness.active.flushSignalEvidencePersistence(...args),
};
globalThis[harnessKey] = harness;

let routeSource = stripTypeScriptTypes(
  await readFile(new URL("../apps/site/src/app/api/cron/watch-agents/route.ts", import.meta.url), "utf8")
);
routeSource = routeSource.replace(/import[\s\S]*?from ["'][^"']+["'];/g, "");
routeSource = `const { prisma, buildHomeBriefing, evaluateWatchAgents, normalizePrefs, upsertAlerts, flushSignalEvidencePersistence } = globalThis.${harnessKey};\n${routeSource}`;

const { GET } = await import(`data:text/javascript;base64,${Buffer.from(routeSource).toString("base64")}`);

function setup(t, overrides = {}) {
  const originalSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "cron-secret";
  t.after(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  const calls = [];
  harness.active = {
    prisma: {
      userIntelPref: {
        findMany: async () => [],
      },
    },
    buildHomeBriefing: async () => {
      calls.push("briefing");
      return { probabilityViews: [], consensusBreaks: [] };
    },
    flushSignalEvidencePersistence: async () => {
      calls.push("flush");
    },
    normalizePrefs: (prefs) => prefs,
    evaluateWatchAgents: () => [],
    upsertAlerts: async () => {
      throw new Error("upsertAlerts should not run by default");
    },
    ...overrides,
  };
  return calls;
}

function cronRequest(secret = "cron-secret") {
  return new Request("https://motivefx.test/api/cron/watch-agents", {
    headers: { authorization: `Bearer ${secret}` },
  });
}

test("watch-agents cron rejects unauthorized requests before touching dependencies", async (t) => {
  const calls = setup(t, {
    prisma: {
      userIntelPref: {
        findMany: async () => {
          throw new Error("database should not be queried");
        },
      },
    },
  });

  const response = await GET(cronRequest("wrong-secret"));

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
  assert.deepEqual(calls, []);
});

test("watch-agents cron refreshes shared intelligence even when no users have enabled agents", async (t) => {
  const calls = setup(t, {
    prisma: {
      userIntelPref: {
        findMany: async (query) => {
          calls.push(["prefs", query]);
          return [
            { userId: "invalid-json", prefsJson: "{" },
            { userId: "disabled-agent", prefsJson: JSON.stringify({ watchAgents: [{ id: "a", enabled: false }] }) },
            { userId: "empty-prefs", prefsJson: "" },
          ];
        },
      },
    },
  });

  const response = await GET(cronRequest());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(calls, [
    ["prefs", { take: 1000, select: { userId: true, prefsJson: true } }],
    "briefing",
    "flush",
  ]);
  assert.equal(body.ok, true);
  assert.equal(body.usersScanned, 3);
  assert.equal(body.usersWithAgents, 0);
  assert.equal(body.agentsEvaluated, 0);
  assert.equal(body.triggered, 0);
  assert.match(body.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("watch-agents cron evaluates enabled agents with the refreshed shared briefing", async (t) => {
  const alertsWritten = [];
  setup(t, {
    prisma: {
      userIntelPref: {
        findMany: async () => [
          {
            userId: "user-1",
            prefsJson: JSON.stringify({
              watchAgents: [
                { id: "enabled", module: "crypto", enabled: true },
                { id: "disabled", module: "stocks", enabled: false },
              ],
            }),
          },
        ],
      },
    },
    buildHomeBriefing: async () => ({
      probabilityViews: [{ symbol: "BTC", motiveSignal: 83 }],
      consensusBreaks: [{ symbol: "BTC", divergence: 21 }],
    }),
    evaluateWatchAgents: (watchAgents, intel) => {
      assert.deepEqual(watchAgents, [{ id: "enabled", module: "crypto", enabled: true }]);
      assert.deepEqual(intel, {
        probabilityViews: [{ symbol: "BTC", motiveSignal: 83 }],
        consensusBreaks: [{ symbol: "BTC", divergence: 21 }],
      });
      return [
        {
          module: "crypto",
          symbol: "BTC",
          title: "BTC signal accelerated",
          body: "Review the refreshed Market DNA.",
          confidence: 88,
          alertKey: "btc-refresh",
        },
      ];
    },
    upsertAlerts: async (userId, alerts) => alertsWritten.push({ userId, alerts }),
  });

  const response = await GET(cronRequest());
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.usersWithAgents, 1);
  assert.equal(body.agentsEvaluated, 1);
  assert.equal(body.triggered, 1);
  assert.deepEqual(alertsWritten, [
    {
      userId: "user-1",
      alerts: [
        {
          module: "crypto",
          symbol: "BTC",
          title: "BTC signal accelerated",
          body: "Review the refreshed Market DNA.",
          confidence: 88,
          alertKey: "btc-refresh",
        },
      ],
    },
  ]);
});
