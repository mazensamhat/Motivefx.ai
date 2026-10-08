import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

function loadRoute(deps) {
  let source = readFileSync(
    new URL("../apps/site/src/app/api/admin/social-performance/route.ts", import.meta.url),
    "utf8"
  );
  source = source
    .replace('import { prisma } from "@motivefx/database";', "const { prisma } = deps.database;")
    .replace('import { requireAdminCapability } from "@/lib/admin";', "const { requireAdminCapability } = deps.admin;")
    .replace(
      'import { badRequest, forbidden, json, serverError, unauthorized } from "@/lib/api";',
      "const { badRequest, forbidden, json, serverError, unauthorized } = deps.api;"
    )
    .replace('import { recordAudit } from "@/lib/ops/audit";', "const { recordAudit } = deps.audit;")
    .replace(/export async function GET/g, "async function GET")
    .replace(/export async function POST/g, "async function POST");

  assert.doesNotMatch(source, /^\s*(import|export)\s/m);

  const code = stripTypeScriptTypes(source);
  return new Function("deps", `${code}; return { GET, POST };`)(deps);
}

function apiHelpers() {
  return {
    badRequest: (message) => Response.json({ error: message }, { status: 400 }),
    forbidden: (message) => Response.json({ error: message }, { status: 403 }),
    json: (body) => Response.json(body),
    serverError: (message) => Response.json({ error: message }, { status: 500 }),
    unauthorized: (message) => Response.json({ error: message }, { status: 401 }),
  };
}

async function readJson(response) {
  return { status: response.status, body: await response.json() };
}

function createDeps({ auth = { ok: true, session: { id: "ops-1", email: "ops@example.invalid" } } } = {}) {
  const calls = {
    auth: [],
    audits: [],
  };
  const deps = {
    admin: {
      requireAdminCapability: async (capability) => {
        calls.auth.push(capability);
        return auth;
      },
    },
    api: apiHelpers(),
    audit: {
      recordAudit: (entry) => calls.audits.push(entry),
    },
    database: {
      prisma: {
        marketingChannel: {
          upsert: async (args) => {
            calls.marketingChannelUpsert = args;
            return {
              id: args.create.id,
              platform: args.create.platform,
              handle: args.create.handle,
              url: args.create.url,
              active: true,
            };
          },
          findMany: async (args) => {
            calls.marketingChannelFindMany = args;
            return [
              {
                id: "youtube",
                platform: "YouTube",
                handle: "@motivefx",
                url: "https://youtube.example/motivefx",
                active: true,
                credentials: {
                  connectionStatus: "connected",
                  lastSyncAt: new Date("2026-10-07T12:00:00.000Z"),
                  syncError: null,
                },
              },
              {
                id: "x",
                platform: "X",
                handle: "@motivefx",
                url: null,
                active: false,
                credentials: null,
              },
            ];
          },
        },
        socialMetricsSnapshot: {
          upsert: async (args) => {
            calls.socialMetricsSnapshotUpsert = args;
            return {
              id: "snapshot-1",
              channelId: args.create.channelId,
              snapshotDate: args.create.snapshotDate,
              syncedAt: new Date("2026-10-08T08:00:00.000Z"),
            };
          },
          findMany: async (args) => {
            calls.socialMetricsSnapshotFindMany = args;
            return [
              {
                id: "newer",
                channelId: "youtube",
                snapshotDate: "2026-10-08",
                followers: 1200,
                impressions: 5000,
                profileViews: 600,
                linkClicks: 80,
                engagementRate: 0.07,
                postsCount: 3,
                syncedAt: new Date("2026-10-08T08:00:00.000Z"),
                channel: { platform: "YouTube", handle: "@motivefx" },
              },
              {
                id: "older",
                channelId: "youtube",
                snapshotDate: "2026-10-07",
                followers: 1100,
                impressions: 4500,
                profileViews: 500,
                linkClicks: 70,
                engagementRate: 0.06,
                postsCount: 2,
                syncedAt: new Date("2026-10-07T08:00:00.000Z"),
                channel: { platform: "YouTube", handle: "@motivefx" },
              },
            ];
          },
        },
        creativePerformanceEvent: {
          count: async () => {
            calls.creativePerformanceEventCount = true;
            return 7;
          },
          create: async (args) => {
            calls.creativePerformanceEventCreate = args;
            return { id: "creative-1" };
          },
        },
      },
    },
  };
  return { deps, calls };
}

test("social performance writes require runtime config capability before reading request JSON", async () => {
  const { deps, calls } = createDeps({ auth: { ok: false, status: 401, error: "Sign in required" } });
  const { POST } = loadRoute(deps);
  const request = new Request("https://motive.test/api/admin/social-performance", {
    method: "POST",
    body: "{not json",
  });

  const result = await readJson(await POST(request));

  assert.equal(result.status, 401);
  assert.deepEqual(result.body, { error: "Sign in required" });
  assert.deepEqual(calls.auth, ["manage_runtime_config"]);
  assert.equal(calls.marketingChannelUpsert, undefined);
  assert.equal(calls.socialMetricsSnapshotUpsert, undefined);
  assert.equal(calls.creativePerformanceEventCreate, undefined);
});

test("social performance ingest normalizes connector payloads and records an audit trail", async () => {
  const { deps, calls } = createDeps();
  const { POST } = loadRoute(deps);
  const request = new Request("https://motive.test/api/admin/social-performance", {
    method: "POST",
    body: JSON.stringify({
      platform: " Tik Tok ",
      handle: "@motivefx",
      url: "https://social.example/motivefx",
      snapshotDate: "2026-10-08",
      followers: "10.6",
      impressions: "-2",
      profileViews: "12.2",
      linkClicks: "Infinity",
      engagementRate: "0.153",
      postsCount: "2.6",
      raw: { connector: "qa", nested: { ok: true } },
      creative: {
        runId: "run-1",
        hypothesisId: "hyp-1",
        traderPersona: "swing",
        hookFamily: "risk-reversal",
        hold3s: "-4",
        watchTimeSec: "33.7",
        landings: "4.4",
        signups: "2.2",
        activations: "NaN",
        paid: "1",
        notes: "qa import",
      },
    }),
  });

  const result = await readJson(await POST(request));

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    ok: true,
    channelId: "tik-tok",
    snapshotId: "snapshot-1",
    creativeEventId: "creative-1",
  });
  assert.deepEqual(calls.auth, ["manage_runtime_config"]);
  assert.equal(calls.marketingChannelUpsert.where.id, "tik-tok");
  assert.deepEqual(calls.marketingChannelUpsert.create, {
    id: "tik-tok",
    platform: "Tik Tok",
    handle: "@motivefx",
    url: "https://social.example/motivefx",
    active: true,
  });
  assert.deepEqual(calls.socialMetricsSnapshotUpsert.where, {
    channelId_snapshotDate: { channelId: "tik-tok", snapshotDate: "2026-10-08" },
  });
  assert.equal(calls.socialMetricsSnapshotUpsert.create.followers, 11);
  assert.equal(calls.socialMetricsSnapshotUpsert.create.impressions, 0);
  assert.equal(calls.socialMetricsSnapshotUpsert.create.profileViews, 12);
  assert.equal(calls.socialMetricsSnapshotUpsert.create.linkClicks, 0);
  assert.equal(calls.socialMetricsSnapshotUpsert.create.engagementRate, 0.153);
  assert.equal(calls.socialMetricsSnapshotUpsert.create.postsCount, 3);
  assert.equal(calls.socialMetricsSnapshotUpsert.create.rawJson, JSON.stringify({ connector: "qa", nested: { ok: true } }));
  assert.equal(calls.creativePerformanceEventCreate.data.platform, "Tik Tok");
  assert.equal(calls.creativePerformanceEventCreate.data.impressions, 0);
  assert.equal(calls.creativePerformanceEventCreate.data.hold3s, 0);
  assert.equal(calls.creativePerformanceEventCreate.data.watchTimeSec, 33.7);
  assert.equal(calls.creativePerformanceEventCreate.data.landings, 4);
  assert.equal(calls.creativePerformanceEventCreate.data.signups, 2);
  assert.equal(calls.creativePerformanceEventCreate.data.activations, 0);
  assert.equal(calls.creativePerformanceEventCreate.data.paid, 1);
  assert.equal(calls.creativePerformanceEventCreate.data.createdBy, "ops@example.invalid");
  assert.deepEqual(calls.audits, [
    {
      actorId: "ops-1",
      actorEmail: "ops@example.invalid",
      action: "social.performance.ingest",
      capability: "manage_runtime_config",
      risk: "MEDIUM",
      targetType: "marketing_channel",
      targetId: "tik-tok",
      result: "success",
      after: {
        snapshotDate: "2026-10-08",
        platform: "Tik Tok",
        creativeEventId: "creative-1",
      },
    },
  ]);
});

test("social performance ingest preserves existing optional fields when connector omits them", async () => {
  const { deps, calls } = createDeps();
  const { POST } = loadRoute(deps);
  const request = new Request("https://motive.test/api/admin/social-performance", {
    method: "POST",
    body: JSON.stringify({ channelId: "youtube", platform: "YouTube", snapshotDate: "2026-10-08" }),
  });

  const result = await readJson(await POST(request));

  assert.equal(result.status, 200);
  assert.equal(calls.marketingChannelUpsert.update.handle, undefined);
  assert.equal(calls.marketingChannelUpsert.update.url, undefined);
  assert.equal(calls.socialMetricsSnapshotUpsert.update.rawJson, undefined);
  assert.equal(calls.creativePerformanceEventCreate, undefined);
  assert.equal(result.body.creativeEventId, null);
});

test("social performance dashboard read uses revenue capability and returns latest channel snapshot", async () => {
  const { deps, calls } = createDeps();
  const { GET } = loadRoute(deps);

  const result = await readJson(await GET());

  assert.equal(result.status, 200);
  assert.deepEqual(calls.auth, ["view_revenue"]);
  assert.equal(calls.marketingChannelFindMany.orderBy.platform, "asc");
  assert.equal(calls.socialMetricsSnapshotFindMany.orderBy.syncedAt, "desc");
  assert.equal(calls.socialMetricsSnapshotFindMany.take, 100);
  assert.equal(result.body.creativePerformanceEvents, 7);
  assert.equal(result.body.channels.length, 2);
  assert.deepEqual(result.body.channels[0], {
    id: "youtube",
    platform: "YouTube",
    handle: "@motivefx",
    url: "https://youtube.example/motivefx",
    active: true,
    connectionStatus: "connected",
    lastSyncAt: "2026-10-07T12:00:00.000Z",
    syncError: null,
    latest: {
      snapshotDate: "2026-10-08",
      followers: 1200,
      impressions: 5000,
      profileViews: 600,
      linkClicks: 80,
      engagementRate: 0.07,
      postsCount: 3,
      syncedAt: "2026-10-08T08:00:00.000Z",
    },
  });
  assert.equal(result.body.channels[1].connectionStatus, "disconnected");
  assert.equal(result.body.channels[1].latest, null);
});
