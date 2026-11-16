import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

// Load the real service while replacing only its two module dependencies. This
// suite requires neither Prisma generation nor live provider/database secrets.
const sourceUrl = new URL('../src/lib/ops/outcomes.ts', import.meta.url);
const policyUrl = new URL('../src/lib/ops/outcome-policy.ts', import.meta.url).href;
const db = { signalOutcome: {} };
const key = Symbol.for('motivefx.outcome-service-test.db');
globalThis[key] = db;
let source = await readFile(sourceUrl, 'utf8');
assert.ok(source.includes('import { prisma } from "@motivefx/database";'));
assert.ok(source.includes('from "./outcome-policy"'));
source = source.replace('import { prisma } from "@motivefx/database";', 'const prisma = globalThis[Symbol.for("motivefx.outcome-service-test.db")];')
  .replace('from "./outcome-policy"', `from ${JSON.stringify(policyUrl)}`);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`;
const { evaluatePendingOutcomes, buildCalibrationFromOutcomes } = await import(moduleUrl);
const DAY_MS = 86_400_000;
const originalFetch = globalThis.fetch;
const originalKey = process.env.FINNHUB_API_KEY;
const originalEnabled = process.env.FINNHUB_HISTORICAL_ENABLED;
const originalCg = process.env.COINGECKO_OUTCOMES_ENABLED;

function setup(t, options = {}) {
  const queries = [], writes = [], calls = [];
  const row = {
    id:'fixture',symbol:'FIXTURE',predictedScore:75,predictedConf:85,horizonDays:30,
    evaluatorVersion:'MARKET_OUTCOME_V2',outcome:'PENDING',
    // DB insertion is much later than the frozen prediction: still due today.
    createdAt:new Date(Date.now()-DAY_MS),
    snapshot:{recordedAt:new Date(Date.now()-40*DAY_MS)},
    ...options.row,
  };
  db.signalOutcome.findMany = async args => {
    queries.push(args);
    if (args.include && typeof args.where.evaluatorVersion === 'string') {
      return (options.coverageRows ?? [row]).filter(candidate => candidate.evaluatorVersion === args.where.evaluatorVersion);
    }
    return args.include ? [row] : (options.calibrationRows ?? []);
  };
  db.signalOutcome.count = async () => 0;
  db.signalOutcome.groupBy = async () => options.pendingGroups ?? [];
  db.signalOutcome.updateMany = async args => { writes.push(args); return {count:options.writeCount ?? 1}; };
  process.env.FINNHUB_API_KEY = 'test-not-a-real-key';
  process.env.FINNHUB_HISTORICAL_ENABLED = 'true';
  process.env.COINGECKO_OUTCOMES_ENABLED = 'false';
  globalThis.fetch = async (url, init) => {
    calls.push({url,init});
    if (options.fail) return new Response('', {status:503});
    const cutoff = Number(new URL(url).searchParams.get('to'))*1000;
    return new Response(JSON.stringify({s:'ok',t:[(cutoff-2*DAY_MS)/1000],c:[calls.length % 2 ? 100 : 110]}));
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.FINNHUB_API_KEY; else process.env.FINNHUB_API_KEY = originalKey;
    if (originalEnabled === undefined) delete process.env.FINNHUB_HISTORICAL_ENABLED; else process.env.FINNHUB_HISTORICAL_ENABLED = originalEnabled;
    if (originalCg === undefined) delete process.env.COINGECKO_OUTCOMES_ENABLED; else process.env.COINGECKO_OUTCOMES_ENABLED = originalCg;
  });
  return {queries,writes,calls,row};
}

test('disabled provider does not consume pending outcomes or call the database', async t => {
  const state = setup(t);
  process.env.FINNHUB_HISTORICAL_ENABLED = 'false';
  assert.deepEqual(await evaluatePendingOutcomes(), {evaluated:0,inconclusive:0});
  assert.equal(state.queries.length,0);
  assert.equal(state.writes.length,0);
  assert.equal(state.calls.length,0);
});
test('missing provider key also leaves pending outcomes untouched', async t => {
  const state = setup(t);
  delete process.env.FINNHUB_API_KEY;
  await evaluatePendingOutcomes();
  assert.equal(state.queries.length,0);
});
test('due horizon uses frozen timestamp; successful evaluation records V4 provenance', async t => {
  const state = setup(t);
  assert.deepEqual(await evaluatePendingOutcomes(), {evaluated:1,inconclusive:0});
  assert.equal(state.writes[0].data.outcome,'CONFIRMED');
  assert.equal(state.writes[0].data.evaluatorVersion,'MARKET_OUTCOME_V4');
  assert.match(state.writes[0].data.notes,/not execution prices/);
  assert.equal(state.calls.length,2);
  const requested = state.calls.map(c => Number(new URL(c.url).searchParams.get('to'))*1000);
  assert.equal(requested[1]-requested[0],30*DAY_MS);
  assert.ok(state.calls.every(c => c.init.signal instanceof AbortSignal));
});
test('provider failure is excluded and remains eligible for a bounded retry', async t => {
  const state = setup(t,{fail:true});
  assert.deepEqual(await evaluatePendingOutcomes(),{evaluated:0,inconclusive:1});
  assert.equal(state.writes[0].data.outcome,'INCONCLUSIVE');
  assert.match(state.writes[0].data.notes,/^RETRYABLE_MARKET_DATA:/);
  assert.equal(state.writes[0].data.realizedReturnPct,null);
  const retry = state.queries[0].where.OR[1];
  assert.equal(retry.outcome,'INCONCLUSIVE');
  assert.ok(retry.evaluatedAt.lte.getTime() <= Date.now()-59*60*1000);
  assert.ok(retry.OR.some(rule => rule.notes?.startsWith === 'RETRYABLE_MARKET_DATA: '));
});
test('an eligible retryable result can recover to a scored V4 observation', async t => {
  const state = setup(t,{row:{outcome:'INCONCLUSIVE',evaluatorVersion:'MARKET_OUTCOME_V4'}});
  assert.deepEqual(await evaluatePendingOutcomes(),{evaluated:1,inconclusive:0});
  assert.equal(state.writes[0].where.outcome,'INCONCLUSIVE');
  assert.equal(state.writes[0].data.outcome,'CONFIRMED');
});
test('immature predictions are neither fetched nor scored', async t => {
  const state = setup(t,{row:{snapshot:{recordedAt:new Date()}}});
  await evaluatePendingOutcomes();
  assert.equal(state.calls.length,0);
  assert.equal(state.writes.length,0);
});
test('invalid frozen score is excluded without asking a provider', async t => {
  const state = setup(t,{row:{predictedScore:NaN}});
  assert.deepEqual(await evaluatePendingOutcomes(),{evaluated:0,inconclusive:1});
  assert.equal(state.calls.length,0);
  assert.doesNotMatch(state.writes[0].data.notes,/^RETRYABLE_MARKET_DATA:/);
});
test('compare-and-set losers never double-count or overwrite completed outcomes', async t => {
  const state = setup(t,{writeCount:0});
  assert.deepEqual(await evaluatePendingOutcomes(),{evaluated:0,inconclusive:0});
  assert.deepEqual(state.writes[0].where,{id:'fixture',outcome:'PENDING',evaluatorVersion:'MARKET_OUTCOME_V2'});
});
test('calibration only reads finalized V4 observations and reports disabled capability', async t => {
  const state = setup(t,{calibrationRows:[{predictedConf:null,outcome:'CONFIRMED'},{predictedConf:85,outcome:'CONFIRMED'}]});
  process.env.FINNHUB_HISTORICAL_ENABLED='false';
  const summary = await buildCalibrationFromOutcomes();
  assert.equal(state.queries[0].where.evaluatorVersion,'MARKET_OUTCOME_V4');
  assert.equal(summary.evaluated,1);
  assert.equal(summary.excludedInvalid,1);
  assert.equal(summary.forecastReady,false);
  assert.equal(summary.historicalDataEnabled,false);
  assert.match(summary.note,/pending outcomes are preserved/);
});


test('calibration reads never evaluate or contact providers even when capabilities are enabled', async t => {
  const state = setup(t);
  const summary = await buildCalibrationFromOutcomes();
  assert.equal(summary.availability, 'available');
  assert.equal(summary.lastBatch, null);
  assert.equal(state.writes.length, 0);
  assert.equal(state.calls.length, 0);
  assert.ok(state.queries.every(query => !query.cursor && !query.where.OR));
});

test('pending coverage separates versions and uses the frozen snapshot horizon', async t => {
  const row = version => ({
    id: version, symbol: 'FIXTURE', evaluatorVersion: version, outcome: 'PENDING', predictedScore: 75, horizonDays: 30,
    createdAt: new Date(),
    snapshot: { symbol: 'FIXTURE', recordedAt: new Date(Date.now() - 40 * DAY_MS), evidenceJson: '[{"id":"opp-stock-fixture","market":"stocks"}]' },
  });
  const state = setup(t, {
    coverageRows: [row('MARKET_OUTCOME_V4'), row('LEGACY_SIGNAL_V1')],
    pendingGroups: [
      { evaluatorVersion: 'MARKET_OUTCOME_V4', _count: { _all: 400 } },
      { evaluatorVersion: 'LEGACY_SIGNAL_V1', _count: { _all: 3000 } },
    ],
  });
  const summary = await buildCalibrationFromOutcomes();
  assert.deepEqual(summary.pendingByVersion, { MARKET_OUTCOME_V4: 400, LEGACY_SIGNAL_V1: 3000 });
  assert.equal(summary.pending, 3400);
  assert.equal(summary.pendingEligibilitySample.sampled, 2);
  assert.equal(summary.pendingEligibilitySample.truncated, true);
  for (const version of ['MARKET_OUTCOME_V4', 'LEGACY_SIGNAL_V1']) {
    const sample = summary.pendingEligibilitySample.byVersion[version];
    assert.equal(sample.sampled, 1);
    assert.equal(sample.pastSnapshotHorizon, 1, 'later insertion does not delay an already-mature snapshot');
    assert.equal(sample.reasons.ready_for_provider_check, 1);
  }
  assert.equal(state.writes.length, 0);
  assert.equal(state.calls.length, 0);
  const coverageQueries = state.queries.filter(query => query.include);
  assert.equal(coverageQueries.length, 4);
  assert.ok(coverageQueries.every(query => query.take === 250 && typeof query.where.evaluatorVersion === 'string'));
});

test('unread outcome store stays unknown, never a zero backlog or successful calibration', async t => {
  const state = setup(t);
  db.signalOutcome.groupBy = async () => { throw new Error('fixture database unavailable'); };
  const summary = await buildCalibrationFromOutcomes();
  assert.equal(summary.availability, 'unavailable');
  assert.equal(summary.evaluated, null);
  assert.equal(summary.pending, null);
  assert.equal(summary.pendingByVersion, null);
  assert.equal(summary.pendingEligibilitySample, null);
  assert.equal(summary.forecastReady, false);
  assert.equal(state.writes.length, 0);
  assert.equal(state.calls.length, 0);
});

test('explicit evaluator result can be attached without running a second batch', async t => {
  const state = setup(t);
  const result = { evaluated: 3, inconclusive: 2 };
  const summary = await buildCalibrationFromOutcomes(result);
  assert.deepEqual(summary.lastBatch, result);
  assert.equal(state.writes.length, 0);
  assert.equal(state.calls.length, 0);
});


test('an available empty store reports real zero counts', async t => {
  const state = setup(t, { coverageRows: [], pendingGroups: [] });
  const summary = await buildCalibrationFromOutcomes();
  assert.equal(summary.availability, 'available');
  assert.equal(summary.evaluated, 0);
  assert.equal(summary.pending, 0);
  assert.deepEqual(summary.pendingByVersion, {});
  assert.equal(summary.pendingEligibilitySample.sampled, 0);
  assert.equal(summary.pendingEligibilitySample.truncated, false);
  assert.equal(summary.forecastReady, false);
  assert.equal(state.writes.length, 0);
  assert.equal(state.calls.length, 0);
});
