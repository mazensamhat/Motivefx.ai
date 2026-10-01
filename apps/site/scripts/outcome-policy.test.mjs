import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_MS, OUTCOME_EVALUATOR_VERSION, OUTCOME_SEED_VERSIONS,
  selectCompletedDailyClose, outcomeDueAt, classifyObservedReturn, summarizeCalibration,
} from '../src/lib/ops/outcome-policy.ts';

const at = Date.parse('2026-09-21T12:00:00Z');
const candles = (pairs) => ({ s: 'ok', t: pairs.map(([time]) => time / 1000), c: pairs.map(([, close]) => close) });

test('uses latest completed close, not nearer incomplete or future closes', () => {
  const selected = selectCompletedDailyClose(candles([[at - 2 * DAY_MS, 100], [at - 60_000, 999], [at + 60_000, 9999]]), at);
  assert.equal(selected?.price, 100);
  assert.ok(selected.availableAtMs <= at);
});
test('includes a daily bar at the exact conservative completion boundary', () => {
  assert.equal(selectCompletedDailyClose(candles([[at - DAY_MS, 123]]), at)?.price, 123);
});
test('future-only and incomplete-only responses remain unavailable', () => {
  assert.equal(selectCompletedDailyClose(candles([[at + DAY_MS, 100], [at - 1, 101]]), at), null);
});
test('chooses the newest valid completed bar even when provider rows are unsorted', () => {
  assert.equal(selectCompletedDailyClose(candles([[at - 2 * DAY_MS, 102], [at - 4 * DAY_MS, 100], [at - 3 * DAY_MS, 101]]), at)?.price, 102);
});
test('accepts weekend-sized gaps but rejects stale closes', () => {
  assert.equal(selectCompletedDailyClose(candles([[at - 4 * DAY_MS, 100]]), at)?.price, 100);
  assert.equal(selectCompletedDailyClose(candles([[at - 6 * DAY_MS, 100]]), at), null);
});
for (const [name, raw] of [
  ['null', null], ['missing arrays', {s:'ok'}], ['provider no_data', {s:'no_data',t:[],c:[]}],
  ['unequal arrays', {s:'ok',t:[(at-DAY_MS)/1000],c:[]}], ['string arrays', {s:'ok',t:'bad',c:'bad'}],
]) test(`rejects malformed candle response: ${name}`, () => assert.equal(selectCompletedDailyClose(raw, at), null));
for (const price of [0, -1, NaN, Infinity, '100', null]) {
  test(`rejects non-positive/non-finite/non-number close ${String(price)}`, () => {
    assert.equal(selectCompletedDailyClose(candles([[at - DAY_MS, price]]), at), null);
  });
}
test('rejects invalid timestamps and invalid evaluation cutoffs', () => {
  assert.equal(selectCompletedDailyClose({s:'ok',t:[NaN, Infinity, '123'],c:[1,1,1]}, at), null);
  assert.equal(selectCompletedDailyClose(candles([[at - DAY_MS, 100]]), NaN), null);
});
test('horizon is anchored to frozen prediction timestamp', () => assert.equal(outcomeDueAt(at, 30), at + 30 * DAY_MS));
for (const horizon of [0, -1, 0.5, NaN, Infinity]) {
  test(`rejects invalid horizon ${String(horizon)}`, () => assert.equal(outcomeDueAt(at, horizon), null));
}
test('rejects invalid/overflowed prediction timestamps', () => {
  assert.equal(outcomeDueAt(NaN, 30), null);
  assert.equal(outcomeDueAt(8.64e15, 30), null);
});
for (const [label, score, end, expected] of [
  ['bull confirmed', 75, 102, 'CONFIRMED'], ['bull partial', 75, 100.5, 'PARTIAL'], ['bull rejected', 75, 98, 'REJECTED'],
  ['bear confirmed', 25, 98, 'CONFIRMED'], ['bear partial', 25, 99.5, 'PARTIAL'], ['bear rejected', 25, 102, 'REJECTED'],
  ['neutral confirmed', 50, 100.5, 'CONFIRMED'], ['neutral partial', 50, 102, 'PARTIAL'], ['neutral rejected', 50, 105, 'REJECTED'],
]) test(label, () => assert.equal(classifyObservedReturn(score, 100, end)?.outcome, expected));
test('invalid scores and prices never count as evaluated outcomes', () => {
  for (const score of [NaN, Infinity, -1, 101]) assert.equal(classifyObservedReturn(score, 100, 101), null);
  for (const price of [NaN, Infinity, 0, -1]) assert.equal(classifyObservedReturn(75, price, 101), null);
});
test('V3 keeps V2 pending seeds eligible without treating V2 finalized rows as V3', () => {
  assert.equal(OUTCOME_EVALUATOR_VERSION, 'MARKET_OUTCOME_V3');
  assert.ok(OUTCOME_SEED_VERSIONS.includes('MARKET_OUTCOME_V2'));
});
test('fractional confidence values fall into exactly one bucket', () => {
  const summary = summarizeCalibration([49.9,59.9,69.9,79.9,89.9,99.9,100].map(predictedConf => ({predictedConf,outcome:'CONFIRMED'})));
  assert.deepEqual(summary.buckets.map(b => b.sampleSize), [2,1,1,1,1,1]);
  assert.equal(summary.buckets.reduce((n,b) => n+b.sampleSize, 0), summary.evaluated);
});
test('null and invalid confidence never masquerade as low-confidence samples', () => {
  const rows = [null,NaN,Infinity,-1,101].map(predictedConf => ({predictedConf,outcome:'CONFIRMED'}));
  const summary = summarizeCalibration(rows);
  assert.equal(summary.evaluated, 0);
  assert.equal(summary.excludedInvalid, 5);
  assert.equal(summary.forecastReady, false);
});
test('pending and inconclusive samples never train calibration', () => {
  assert.equal(summarizeCalibration([{predictedConf:90,outcome:'PENDING'},{predictedConf:90,outcome:'INCONCLUSIVE'}]).evaluated, 0);
});
test('partial outcomes count half, not as full successes', () => {
  const summary = summarizeCalibration(['CONFIRMED','PARTIAL','REJECTED'].map(outcome => ({predictedConf:80,outcome})));
  assert.equal(summary.buckets[1].observedReliability, 50);
});
test('insufficient samples cannot unlock forecast readiness', () => {
  const make = n => Array.from({length:n}, () => ({predictedConf:85,outcome:'CONFIRMED'}));
  assert.equal(summarizeCalibration(make(29)).buckets[1].calibrationReady, false);
  assert.equal(summarizeCalibration(make(99)).forecastReady, false);
  assert.equal(summarizeCalibration(make(100)).forecastReady, true);
});
