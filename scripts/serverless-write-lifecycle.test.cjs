// Execute the real route/auth source with isolated external services and an after() queue.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
let ts;
try {
  ts = require(require.resolve('typescript', { paths: [path.join(root, 'web')] }));
} catch {
  ts = require('typescript');
}

const authPath = 'apps/site/src/lib/terminal/auth.ts';
const briefingPath = 'apps/site/src/app/api/home/briefing/route.ts';

function load(relative, mocks, extra = {}) {
  const filename = path.join(root, relative);
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, 'edited TypeScript must parse');
  const module = { exports: {} };
  const sandbox = {
    module, exports: module.exports, Response, Request, Headers, Date, Promise,
    console: { warn() {}, error() {}, log() {} },
    setTimeout: () => 1, clearTimeout() {},
    require(name) {
      if (!Object.hasOwn(mocks, name)) throw new Error(`Unmocked dependency: ${name}`);
      return mocks[name];
    },
    ...extra,
  };
  vm.runInNewContext(result.outputText, sandbox, { filename });
  return module.exports;
}

function authFixture(options = {}) {
  const queue = [], writes = [];
  const user = { id: 'test-user', email: 'user@example.test', disabledAt: null, ...options.user };
  const mocks = {
    'next/server': { after(fn) { if (options.scheduleFails) throw new Error('no request'); queue.push(fn); } },
    '@motivefx/database': { prisma: { user: { update: async data => {
      writes.push(data);
      if (options.writeFails) throw new Error('database unavailable');
      if (options.wait) await options.wait;
      return user;
    } } } },
    '../api': { unauthorized: () => Response.json({ error: 'Unauthorized' }, { status: 401 }), forbidden: () => new Response(null, { status: 403 }) },
    '../load-user': { findUserSafe: async () => user, findUserSafeCached: async () => options.missingUser ? null : user },
    '@/lib/ops/impersonation': { getEffectiveSession: async () => options.anonymous ? null : { id: user.id, impersonating: !!options.impersonating } },
  };
  return { api: load(authPath, mocks), queue, writes, user };
}

function briefingFixture(options = {}) {
  const queue = [], writes = [], preferenceReads = [], cleared = [], warnings = [];
  const user = { id: 'test-user', email: 'user@example.test', displayName: 'User', disabledAt: null, ...options.user };
  const briefing = { personalized: { radarHits: [{ id: 'r1', symbol: 'TEST', module: 'trades', confidence: 75, title: 'Fixture radar' }] }, opportunities: [] };
  const mocks = {
    'next/server': { after: fn => queue.push(fn) },
    '@/lib/api': { json: data => Response.json(data) },
    '@/lib/terminal/home-briefing': { buildHomeBriefing: async () => { if (options.buildFails) throw new Error('feed down'); return briefing; } },
    '@/lib/session': { getSession: async () => options.anonymous ? null : { id: user.id, email: user.email } },
    '@/lib/load-user': { findUserSafeCached: async () => options.missingUser ? null : user },
    '@/lib/terminal/ios-reader': { entitlementsPlanForUser: async () => ({ features: { push_notifications: !options.noFeature } }) },
    '@/lib/terminal/alerts': { upsertAlerts: async (id, rows) => {
      writes.push({ id, rows });
      if (options.writeFails) throw new Error('database unavailable');
      if (options.wait) await options.wait;
    } },
    '@/lib/terminal/engines': { evaluateSignalAlertRules: () => [] },
    '../../../../../../../packages/shared/src/briefing-period': { formatBriefingGreeting: (p, n) => `Hello ${n}`, formatBriefingKicker: () => 'Fixture', getBriefingPeriod: () => 'morning' },
    '@/lib/terminal/intel-prefs': { getIntelPrefs: async id => { preferenceReads.push(id); return { alertRules: [] }; } },
  };
  const api = load(briefingPath, mocks, { clearTimeout: id => cleared.push(id), console: { warn: value => warnings.push(value), error() {}, log() {} } });
  return { api, queue, writes, preferenceReads, cleared, warnings, briefing };
}

function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}

const request = () => new Request('https://example.test/api/home/briefing?user_id=other-user');

test('anonymous auth remains denied and schedules no telemetry', async () => {
  const f = authFixture({ anonymous: true });
  const result = await f.api.requireTerminalSession();
  assert.equal(result.ok, false); assert.equal(result.response.status, 401);
  assert.equal(f.queue.length, 0); assert.equal(f.writes.length, 0);
});

test('disabled accounts remain denied and schedule no telemetry', async () => {
  const f = authFixture({ user: { disabledAt: new Date() } });
  assert.equal((await f.api.requireTerminalSession()).ok, false);
  assert.equal(f.queue.length, 0);
});

test('last-seen is deferred until after the response', async () => {
  const f = authFixture();
  assert.equal((await f.api.requireTerminalSession()).ok, true);
  assert.equal(f.queue.length, 1); assert.equal(f.writes.length, 0);
  await f.queue[0]();
  assert.equal(f.writes.length, 1); assert.equal(f.writes[0].where.id, 'test-user');
});

test('last-seen callback awaits database completion', async () => {
  const d = deferred(), f = authFixture({ wait: d.promise });
  await f.api.requireTerminalSession();
  let completed = false;
  const task = f.queue[0]().then(() => { completed = true; });
  await Promise.resolve(); assert.equal(completed, false);
  d.resolve(); await task; assert.equal(completed, true);
});

test('last-seen remains throttled across parallel feed requests', async () => {
  const f = authFixture();
  await Promise.all(Array.from({ length: 8 }, () => f.api.requireTerminalSession()));
  assert.equal(f.queue.length, 1);
  await f.queue[0](); await f.api.requireTerminalSession();
  assert.equal(f.queue.length, 1);
});

test('support impersonation never touches customer last-seen', async () => {
  const f = authFixture({ impersonating: true });
  assert.equal((await f.api.requireTerminalSession()).ok, true);
  assert.equal(f.queue.length, 0); assert.equal(f.writes.length, 0);
});

test('failed telemetry releases its throttle claim for a future request', async () => {
  const f = authFixture({ writeFails: true });
  await f.api.requireTerminalSession(); await f.queue[0]();
  await f.api.requireTerminalSession();
  assert.equal(f.queue.length, 2); assert.equal(f.writes.length, 1);
});

test('missing lifecycle context cannot start an untracked write or break auth', async () => {
  const f = authFixture({ scheduleFails: true });
  assert.equal((await f.api.requireTerminalSession()).ok, true);
  assert.equal(f.queue.length, 0); assert.equal(f.writes.length, 0);
});

test('briefing responds before alert database work starts', async () => {
  const f = briefingFixture();
  const response = await f.api.GET(request());
  assert.deepEqual(await response.json(), f.briefing);
  assert.equal(f.queue.length, 1); assert.equal(f.writes.length, 0); assert.equal(f.preferenceReads.length, 0);
  await f.queue[0]();
  assert.equal(f.writes.length, 1); assert.equal(f.writes[0].id, 'test-user');
  assert.equal(f.writes[0].rows[0].alertKey, 'radar-r1');
  assert.equal(f.preferenceReads[0], 'test-user');
});

test('briefing alert callback awaits database completion', async () => {
  const d = deferred(), f = briefingFixture({ wait: d.promise });
  await f.api.GET(request());
  let completed = false;
  const task = f.queue[0]().then(() => { completed = true; });
  await Promise.resolve(); await Promise.resolve(); assert.equal(completed, false);
  d.resolve(); await task; assert.equal(completed, true);
});

test('anonymous request cannot create another user alerts via user_id', async () => {
  const f = briefingFixture({ anonymous: true });
  await f.api.GET(request());
  assert.equal(f.queue.length, 0); assert.equal(f.writes.length, 0);
});

test('missing entitlement does not schedule paid alerts', async () => {
  const f = briefingFixture({ noFeature: true });
  await f.api.GET(request()); assert.equal(f.queue.length, 0);
});

test('failed optional alert persistence is handled once without replaying writes', async () => {
  const f = briefingFixture({ writeFails: true });
  await f.api.GET(request()); await f.queue[0]();
  assert.equal(f.writes.length, 1); assert.equal(f.warnings.length, 1);
});

test('successful and failed briefing calculations clear their deadline timers', async () => {
  const good = briefingFixture(); await good.api.GET(request());
  assert.equal(good.cleared.length, 1);
  const bad = briefingFixture({ buildFails: true });
  const response = await bad.api.GET(request());
  assert.equal((await response.json()).degraded, true); assert.equal(bad.cleared.length, 1);
});

test('post-response lifetime is bounded and calculation timeout remains unchanged', () => {
  const f = briefingFixture();
  assert.equal(f.api.maxDuration, 60);
  const source = fs.readFileSync(path.join(root, briefingPath), 'utf8');
  assert.match(source, /8_000/);
  assert.doesNotMatch(source, /void\s*\(async/);
});
