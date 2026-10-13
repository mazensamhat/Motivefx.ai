import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(new URL('../web/package.json', import.meta.url));
const ts = require('typescript');
const source = await readFile(new URL('../apps/site/src/lib/ops/durable.ts', import.meta.url), 'utf8');

function fixture() {
  const snapshots = [], outcomes = [], dna = [];
  const prisma = {
    signalSnapshot: { upsert: async args => { snapshots.push(args); return { id: 'snapshot' }; } },
    signalOutcome: { createMany: async args => { outcomes.push(args); } },
    marketDnaSnapshot: { create: async args => { dna.push(args); } },
  };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    module, exports: module.exports, console, setTimeout, clearTimeout,
    require: name => {
      if (name === '@motivefx/database') return { prisma };
      if (name.endsWith('signal-confluence')) return { classifyMotiveStance: () => 'hold' };
      throw Error(`Unexpected dependency: ${name}`);
    },
  });
  return { ...module.exports, snapshots, outcomes, dna };
}
for (const confidence of [0, 55, 78.5, 100, undefined, null, NaN, Infinity, -1, 101]) {
  test(`durable confidence preserves engine value ${confidence} without count inflation`, async () => {
    const f = fixture();
    await f.persistSignalSnapshot({ ledgerId: 'fixture', symbol: 'BTC', motiveSignal: 66,
      evidenceConfidence: confidence, engineVersion: 'fixture', evidence: [],
      signalEvidence: Array.from({ length: 20 }, () => ({ market: 'crypto' })), recordedAt: '2026-10-13T00:00:00Z' });
    const expected = typeof confidence === 'number' && Number.isFinite(confidence) && confidence >= 0 && confidence <= 100 ? confidence : null;
    assert.equal(f.snapshots[0].create.confidence, expected);
    assert.equal(f.snapshots[0].update.confidence, expected);
    assert.equal(f.dna[0].data.confidence, expected);
    assert.equal(f.outcomes[0].data[0].predictedConf, expected);
    assert.equal(f.outcomes[0].skipDuplicates, true);
  });
}
