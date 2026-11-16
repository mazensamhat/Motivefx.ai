import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSiteModule, siteRequire } from './load-site-module.mjs';

async function durableHarness() {
  let row = { id: 'incident-fixture', status: 'open', resolvedAt: null }, failAudit = false, failRead = false;
  const audits = [], queries = [];
  const tx = {
    $queryRaw: async (parts, ...values) => { queries.push({ sql: parts.join('?'), values }); return row ? [{ id: row.id }] : []; },
    opsIncidentRecord: {
      findUnique: async () => row,
      findMany: async () => { if (failRead) throw Error('database unavailable'); return row ? [row] : []; },
      update: async ({ data }) => { row = { ...row, ...data }; return row; },
      upsert: async ({ create, update }) => { if (failRead) throw Error('database unavailable'); row = row ? { ...row, ...update } : create; return row; },
    },
    opsAuditEvent: { create: async ({ data }) => { if (failAudit) throw Error('audit unavailable'); audits.push(data); return data; } },
    opsTelemetryEvent: { findMany: async () => { if (failRead) throw Error('database unavailable'); return []; } },
  };
  const prisma = { ...tx, $transaction: async fn => {
    const before = structuredClone(row), oldAudits = [...audits];
    try { return await fn(tx); } catch (error) { row = before; audits.splice(0, audits.length, ...oldAudits); throw error; }
  } };
  const mod = await loadSiteModule('../apps/site/src/lib/ops/durable.ts', {
    'node:crypto': siteRequire('node:crypto'), '@motivefx/database': { prisma },
    '@/lib/terminal/market-truth/signal-confluence': { classifyMotiveStance: () => 'neutral' },
  });
  return { mod, audits, queries, get row() { return row; }, setRow: value => { row = value; }, failAudit: () => { failAudit = true; }, failRead: () => { failRead = true; } };
}
const operator = { id: 'incident-fixture', actorId: 'operator-fixture', actorEmail: 'operator@example.invalid' };
test('incident status and audit commit together after locking the record', async () => {
  const h = await durableHarness();
  assert.equal(await h.mod.updateIncidentStatus({ ...operator, status: 'resolved' }), true);
  assert.equal(h.row.status, 'resolved'); assert.ok(h.row.resolvedAt instanceof Date);
  assert.equal(h.audits.length, 1); assert.equal(h.audits[0].result, 'success');
  assert.deepEqual(JSON.parse(h.audits[0].beforeJson), { status: 'open' });
  assert.deepEqual(JSON.parse(h.audits[0].afterJson), { status: 'resolved' });
  assert.match(h.queries[0].sql, /FOR UPDATE/); assert.equal(h.queries[0].values[0], operator.id);
  await h.mod.updateIncidentStatus({ ...operator, status: 'investigating' });
  assert.equal(h.row.resolvedAt, null);
});
test('audit failure rolls back status and propagates instead of reporting success', async () => {
  const h = await durableHarness(); h.failAudit();
  await assert.rejects(h.mod.updateIncidentStatus({ ...operator, status: 'resolved' }), /audit unavailable/);
  assert.equal(h.row.status, 'open'); assert.equal(h.audits.length, 0);
});
test('missing incident never records a success audit', async () => {
  const h = await durableHarness(); h.setRow(null);
  assert.equal(await h.mod.updateIncidentStatus({ ...operator, status: 'resolved' }), false);
  assert.equal(h.audits.length, 0);
});
test('recurring live incidents persist their reopened state and clear old resolution metadata', async () => {
  const h = await durableHarness(); h.setRow({ id: operator.id, status: 'resolved', resolvedAt: new Date(), acknowledgedBy: 'old', acknowledgedAt: new Date() });
  await h.mod.upsertIncident({ id: operator.id, severity: 'HIGH', domain: 'fixture', title: 'Recurring condition', description: '', source: 'fixture' });
  assert.equal(h.row.status, 'open'); assert.equal(h.row.resolvedAt, null); assert.equal(h.row.acknowledgedBy, null);
});
test('strict reads and materialization expose storage failure instead of healthy empty data', async () => {
  const h = await durableHarness(); h.failRead();
  await assert.rejects(h.mod.loadIncidents(100, { strict: true }), /database unavailable/);
  await assert.rejects(h.mod.loadRecentTelemetry(500, { strict: true }), /database unavailable/);
  await assert.rejects(h.mod.upsertIncident({ id: operator.id }), /database unavailable/);
  assert.equal((await h.mod.loadIncidents()).length, 0); // Preserve unrelated legacy callers.
});

async function incidentHarness(overrides = {}) {
  const deps = {
    buildCommandAttention: async () => ({ generatedAt: new Date().toISOString(), items: [] }),
    loadIncidents: async () => [], loadRecentTelemetry: async () => [],
    updateIncidentStatus: async () => true, upsertIncident: async () => {}, ...overrides,
  };
  const mod = await loadSiteModule('../apps/site/src/lib/ops/incidents.ts', { './attention': deps, './durable': deps });
  return { mod, deps };
}
test('incident listing awaits materialization before reading durable state', async () => {
  let release, reads = 0;
  const barrier = new Promise(resolve => { release = resolve; });
  const h = await incidentHarness({
    buildCommandAttention: async () => ({ generatedAt: new Date().toISOString(), items: [{ id: operator.id, severity: 'high', domain: 'providers', title: 'Unavailable' }] }),
    upsertIncident: () => barrier,
    loadIncidents: async () => { reads++; return []; },
  });
  const listing = h.mod.listOpsIncidents(); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(reads, 0); release(); assert.equal((await listing).length, 1); assert.equal(reads, 1);
});
test('materialization and acknowledgment failures remain rejected', async () => {
  const h = await incidentHarness({
    buildCommandAttention: async () => ({ generatedAt: new Date().toISOString(), items: [{ id: operator.id, severity: 'high', domain: 'providers', title: 'Unavailable' }] }),
    upsertIncident: async () => { throw Error('write failed'); }, updateIncidentStatus: async () => { throw Error('update failed'); },
  });
  await assert.rejects(h.mod.listOpsIncidents(), /write failed/);
  await assert.rejects(h.mod.acknowledgeIncident({ ...operator, incidentId: operator.id }), /update failed/);
});
test('future and insufficient telemetry never produce an apparent risk forecast', async () => {
  const now = Date.now();
  const rows = [0, 1, 2, 3].map(i => ({ provider: 'fixture', status: 'error', truthState: 'UNAVAILABLE', observedAt: new Date(now - 1000 * (i + 1)).toISOString() }));
  rows.push({ ...rows[0], observedAt: new Date(now + 60_000).toISOString() });
  const h = await incidentHarness({ loadRecentTelemetry: async () => rows });
  assert.equal((await h.mod.forecastOpsRisks()).length, 0);
  rows.push({ ...rows[0], observedAt: new Date(now - 6000).toISOString() });
  const indicators = await h.mod.forecastOpsRisks();
  assert.equal(indicators[0].samples, 5); assert.equal(indicators[0].basis, 'observed_telemetry');
  assert.equal('confidence' in indicators[0], false);
});

async function routeHarness() {
  let canManage = true, signedIn = true, change = async () => true, read = async () => [], writes = 0;
  const response = (body, status = 200) => Response.json(body, { status });
  const api = { json: response, badRequest: message => response({ error: message }, 400), unauthorized: message => response({ error: message }, 401), forbidden: message => response({ error: message }, 403), notFound: message => response({ error: message }, 404), serverError: message => response({ error: message }, 500) };
  const mod = await loadSiteModule('../apps/site/src/app/api/admin/incidents/route.ts', {
    zod: siteRequire('zod'), '@/lib/api': api,
    '@/lib/admin': { requireAdminCapability: async capability => !signedIn ? { ok: false, status: 401 } : capability === 'manage_runtime_config' && !canManage ? { ok: false, status: 403 } : { ok: true, session: { id: operator.actorId, email: operator.actorEmail }, actor: { capabilities: new Set(canManage ? ['view_audit', 'manage_runtime_config'] : ['view_audit']) } } },
    '@/lib/ops/incidents': { listOpsIncidents: () => read(), forecastOpsRisks: async () => [], acknowledgeIncident: async input => { writes++; return change(input); } },
  });
  return { mod, get writes() { return writes; }, setManage: x => { canManage = x; }, signOut: () => { signedIn = false; }, change: fn => { change = fn; }, read: fn => { read = fn; } };
}
const request = (body = { incidentId: operator.id }, origin = 'https://fixture.invalid') => new Request('https://fixture.invalid/api/admin/incidents', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: typeof body === 'string' ? body : JSON.stringify(body) });
test('read-only operators can read but cannot mutate incidents; unauthenticated callers are rejected', async () => {
  const h = await routeHarness(); h.setManage(false);
  assert.equal((await h.mod.GET()).status, 200); assert.equal((await (await h.mod.GET()).json()).canManage, false);
  assert.equal((await h.mod.POST(request())).status, 403); assert.equal(h.writes, 0);
  h.signOut(); assert.equal((await h.mod.POST(request())).status, 401);
});
test('cross-origin and invalid status, identity or JSON payloads never reach storage', async () => {
  const h = await routeHarness();
  assert.equal((await h.mod.POST(request(undefined, 'https://other.invalid'))).status, 403);
  for (const payload of ['{broken', {}, { incidentId: 3 }, { incidentId: '  ' }, { incidentId: operator.id, status: 'admin' }, { incidentId: operator.id, actorId: 'spoof' }]) {
    assert.equal((await h.mod.POST(request(payload))).status, 400);
  }
  assert.equal(h.writes, 0);
});
test('HTTP success waits for durable completion; absent and failed writes return honest failures', async () => {
  const h = await routeHarness(); let release, settled = false;
  h.change(() => new Promise(resolve => { release = resolve; }));
  const pending = h.mod.POST(request()).then(result => { settled = true; return result; });
  await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(settled, false);
  release(true); assert.equal((await pending).status, 200);
  h.change(async () => false); assert.equal((await h.mod.POST(request())).status, 404);
  h.change(async () => { throw Error('database unavailable'); }); assert.equal((await h.mod.POST(request())).status, 500);
});
test('unavailable reads return an error and active counts include acknowledged/investigating incidents', async () => {
  const h = await routeHarness(); h.read(async () => { throw Error('database unavailable'); });
  const failed = await h.mod.GET(); assert.equal(failed.status, 500); assert.equal('incidents' in await failed.json(), false);
  h.read(async () => ['open', 'acknowledged', 'investigating', 'resolved'].map(status => ({ status, severity: 'CRITICAL' })));
  const body = await (await h.mod.GET()).json(); assert.equal(body.open, 3); assert.equal(body.critical, 3);
});
