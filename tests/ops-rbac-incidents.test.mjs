import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";

async function importTs(path, transform = (source) => source) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const javascript = stripTypeScriptTypes(transform(source));
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
}

const rbac = await importTs("../apps/site/src/lib/ops/rbac.ts");

function withOpsRoleAssignments(t, value) {
  const previous = process.env.OPS_ROLE_ASSIGNMENTS;
  if (value === undefined) delete process.env.OPS_ROLE_ASSIGNMENTS;
  else process.env.OPS_ROLE_ASSIGNMENTS = value;
  t.after(() => {
    if (previous === undefined) delete process.env.OPS_ROLE_ASSIGNMENTS;
    else process.env.OPS_ROLE_ASSIGNMENTS = previous;
  });
}

test("ops role assignments are case-insensitive for JSON and CSV sources", (t) => {
  withOpsRoleAssignments(t, '{"Admin@MotiveFX.ai":"support","ops@example.com":"ops_operator"}');
  assert.equal(rbac.resolveOpsRole(" admin@motivefx.ai "), "support");
  assert.equal(rbac.resolveOpsRole("OPS@example.com"), "ops_operator");

  process.env.OPS_ROLE_ASSIGNMENTS = "support@example.com=readonly, ops@example.com=ops_operator";
  assert.equal(rbac.resolveOpsRole("SUPPORT@example.com"), "readonly");
  assert.equal(rbac.resolveOpsRole("ops@example.com"), "ops_operator");
});

test("ops role capabilities prevent support or readonly accounts from high-risk runtime changes", (t) => {
  withOpsRoleAssignments(t, "support@example.com=support,readonly@example.com=readonly,ops@example.com=ops_operator");

  const support = rbac.adminActorFromSession({ id: "support", email: "support@example.com" });
  assert.equal(support.role, "support");
  assert.equal(rbac.actorHas(support, "impersonate_user_support"), true);
  assert.equal(rbac.actorHas(support, "manage_runtime_config"), false);
  assert.throws(() => rbac.requireCapability(support, "manage_runtime_config"), /Missing capability/);

  const readonly = rbac.adminActorFromSession({ id: "readonly", email: "readonly@example.com" });
  assert.equal(readonly.role, "readonly");
  assert.equal(rbac.actorHas(readonly, "view_audit"), true);
  assert.equal(rbac.actorHas(readonly, "manage_users"), false);

  const operator = rbac.adminActorFromSession({ id: "ops", email: "ops@example.com" });
  assert.equal(operator.role, "ops_operator");
  assert.equal(rbac.actorHas(operator, "manage_runtime_config"), true);
  assert.equal(rbac.actorHas(operator, "manage_billing"), false);
});

test("invalid or missing role assignments preserve the legacy full-admin fallback", (t) => {
  withOpsRoleAssignments(t, undefined);
  assert.equal(rbac.resolveOpsRole("admin@example.com"), "full_admin");

  process.env.OPS_ROLE_ASSIGNMENTS = '{"admin@example.com":"not_a_role"}';
  assert.equal(rbac.resolveOpsRole("admin@example.com"), "full_admin");

  process.env.OPS_ROLE_ASSIGNMENTS = "{invalid json";
  assert.equal(rbac.resolveOpsRole("admin@example.com"), "full_admin");
});

const incidentDepsKey = "__motiveOpsIncidentDeps";
globalThis[incidentDepsKey] = {
  buildCommandAttention: async () => ({ generatedAt: new Date().toISOString(), items: [] }),
  loadIncidents: async () => [],
  loadRecentTelemetry: async () => [],
  recordAudit: () => {},
  updateIncidentStatus: () => {},
  upsertIncident: () => {},
};

const incidents = await importTs("../apps/site/src/lib/ops/incidents.ts", (source) =>
  source.replace(
    /import[\s\S]*?from "\.\/(?:attention|audit|durable)";\n/g,
    ""
  ).replace(
    /^/,
    [
      `const incidentDeps = globalThis.${incidentDepsKey};`,
      "const buildCommandAttention = (...args) => incidentDeps.buildCommandAttention(...args);",
      "const loadIncidents = (...args) => incidentDeps.loadIncidents(...args);",
      "const loadRecentTelemetry = (...args) => incidentDeps.loadRecentTelemetry(...args);",
      "const recordAudit = (...args) => incidentDeps.recordAudit(...args);",
      "const updateIncidentStatus = (...args) => incidentDeps.updateIncidentStatus(...args);",
      "const upsertIncident = (...args) => incidentDeps.upsertIncident(...args);",
      "",
    ].join("\n")
  )
);

test("predictive incident forecasts count unavailable truth-state samples as stale risk", async () => {
  const now = new Date("2026-10-07T08:00:00.000Z").toISOString();
  const originalDateNow = Date.now;
  Date.now = () => Date.parse(now);
  globalThis[incidentDepsKey].loadRecentTelemetry = async () => [
    { provider: "polygon", status: "ok", truthState: "UNAVAILABLE", observedAt: "2026-10-07T07:59:00.000Z" },
    { provider: "polygon", status: "ok", truthState: "UNAVAILABLE", observedAt: "2026-10-07T07:58:00.000Z" },
    { provider: "polygon", status: "ok", truthState: "STALE", observedAt: "2026-10-07T07:57:00.000Z" },
    { provider: "polygon", status: "ok", truthState: "FRESH", observedAt: "2026-10-07T07:56:00.000Z" },
    { provider: "polygon", status: "ok", truthState: "FRESH", observedAt: "2026-10-07T07:55:00.000Z" },
    { provider: "legacy", status: "ok", truthState: "EXPIRED", observedAt: "2026-10-07T07:59:00.000Z" },
    { provider: "legacy", status: "ok", truthState: "EXPIRED", observedAt: "2026-10-07T07:58:00.000Z" },
    { provider: "legacy", status: "ok", truthState: "EXPIRED", observedAt: "2026-10-07T07:57:00.000Z" },
    { provider: "legacy", status: "ok", truthState: "FRESH", observedAt: "2026-10-07T07:56:00.000Z" },
    { provider: "legacy", status: "ok", truthState: "FRESH", observedAt: "2026-10-07T07:55:00.000Z" },
  ];

  try {
    const forecasts = await incidents.forecastOpsRisks(1);
    assert.deepEqual(
      forecasts.map((forecast) => ({
        id: forecast.id,
        severity: forecast.severity,
        staleRatePct: forecast.staleRatePct,
      })),
      [{ id: "forecast:provider:polygon", severity: "HIGH", staleRatePct: 60 }]
    );
  } finally {
    Date.now = originalDateNow;
    globalThis[incidentDepsKey].loadRecentTelemetry = async () => [];
  }
});
