import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

// Exercise the real route orchestration with only auth, response, and outcome
// dependencies stubbed. No provider credentials or database access are needed.
const dependencyKey = Symbol.for('motivefx.outcome-routes-test.dependencies');
const dependencies = {};
globalThis[dependencyKey] = dependencies;

async function loadRoute(path) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  source = source.replace(/^import .* from "@\/lib\/(admin|api|ops\/outcomes)";\n/gm, '');
  source = `const { requireAdmin, forbidden, json, serverError, unauthorized, buildCalibrationFromOutcomes, evaluatePendingOutcomes } = globalThis[Symbol.for("motivefx.outcome-routes-test.dependencies")];\n${source}`;
  return import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}#${Math.random()}`);
}

function setup(t, auth = { ok: true }) {
  const events = [];
  const batch = { evaluated: 3, inconclusive: 2 };
  dependencies.requireAdmin = async () => auth;
  dependencies.json = data => Response.json(data);
  dependencies.unauthorized = error => Response.json({ error }, { status: 401 });
  dependencies.forbidden = error => Response.json({ error }, { status: 403 });
  dependencies.serverError = error => Response.json({ error }, { status: 500 });
  dependencies.evaluatePendingOutcomes = async limit => { events.push(['evaluate', limit]); return batch; };
  dependencies.buildCalibrationFromOutcomes = async result => { events.push(['read', result ?? null]); return { lastBatch: result ?? null, forecastReady: false }; };
  const originalSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'test-only-cron-secret';
  t.after(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });
  return { events, batch };
}

test('admin GET only reads calibration', async t => {
  const state = setup(t);
  const route = await loadRoute('../src/app/api/admin/outcomes/route.ts');
  const response = await route.GET();
  assert.equal(response.status, 200);
  assert.deepEqual(state.events, [['read', null]]);
  assert.equal((await response.json()).calibration.lastBatch, null);
});

test('admin POST evaluates exactly one bounded batch, then reads its result', async t => {
  const state = setup(t);
  const route = await loadRoute('../src/app/api/admin/outcomes/route.ts');
  const response = await route.POST();
  assert.equal(response.status, 200);
  assert.deepEqual(state.events, [['evaluate', 100], ['read', state.batch]]);
  assert.deepEqual((await response.json()).calibration.lastBatch, state.batch);
});

for (const status of [401, 403]) {
  test(`admin outcome routes reject ${status} before reading or evaluating`, async t => {
    const state = setup(t, { ok: false, status, error: 'Denied' });
    const route = await loadRoute('../src/app/api/admin/outcomes/route.ts');
    assert.equal((await route.GET()).status, status);
    assert.equal((await route.POST()).status, status);
    assert.deepEqual(state.events, []);
  });
}

test('authorized cron keeps one scheduled batch after summary reads become read-only', async t => {
  const state = setup(t);
  const route = await loadRoute('../src/app/api/cron/outcomes/route.ts');
  const response = await route.GET(new Request('https://fixture.invalid/api/cron/outcomes', {
    headers: { authorization: 'Bearer test-only-cron-secret' },
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(state.events, [['evaluate', 160], ['read', state.batch]]);
  assert.deepEqual((await response.json()).calibration.lastBatch, state.batch);
});

for (const authorization of [undefined, 'Bearer wrong-secret']) {
  test(`cron rejects ${authorization ? 'wrong' : 'missing'} credentials without work`, async t => {
    const state = setup(t);
    const route = await loadRoute('../src/app/api/cron/outcomes/route.ts');
    const response = await route.GET(new Request('https://fixture.invalid/api/cron/outcomes', {
      headers: authorization ? { authorization } : {},
    }));
    assert.equal(response.status, 401);
    assert.deepEqual(state.events, []);
  });
}

test('unconfigured cron secret fails closed', async t => {
  const state = setup(t);
  delete process.env.CRON_SECRET;
  const route = await loadRoute('../src/app/api/cron/outcomes/route.ts');
  const response = await route.GET(new Request('https://fixture.invalid/api/cron/outcomes', {
    headers: { authorization: 'Bearer test-only-cron-secret' },
  }));
  assert.equal(response.status, 401);
  assert.deepEqual(state.events, []);
});
