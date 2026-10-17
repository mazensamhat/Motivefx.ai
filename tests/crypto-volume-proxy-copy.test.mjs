import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';

const require = createRequire(new URL('../web/package.json', import.meta.url));
const ts = require('typescript');

function resolveWebModule(specifier, fromUrl) {
  const base = new URL(specifier, fromUrl);
  const candidates = [
    base,
    new URL(`${base.pathname}.ts`, base),
    new URL(`${base.pathname}.tsx`, base),
    new URL(`${base.pathname}/index.ts`, base),
  ];
  const match = candidates.find((url) => existsSync(url));
  if (!match) throw Error(`Unable to resolve ${specifier} from ${fromUrl.pathname}`);
  return match;
}

function createWebLoader() {
  const cache = new Map();
  const loadUrl = (url) => {
    const key = url.href;
    if (cache.has(key)) return cache.get(key).exports;

    const module = { exports: {} };
    cache.set(key, module);
    const source = readFileSync(url, 'utf8');
    const js = ts.transpileModule(source, {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;

    vm.runInNewContext(js, {
      module,
      exports: module.exports,
      console,
      require: (name) => {
        if (name.startsWith('.')) return loadUrl(resolveWebModule(name, url));
        return require(name);
      },
    });
    return module.exports;
  };
  return (relative) => loadUrl(new URL(relative, import.meta.url));
}

const { buildAssetDeepDive } = createWebLoader()('../web/src/utils/assetDeepDive.ts');

test('crypto volume proxies are described as market activity, not whale transfers', () => {
  const payload = buildAssetDeepDive({
    id: 'btc-volume-proxy',
    symbol: 'BTC',
    sourceType: 'DERIVED',
    from: '24h volume proxy',
    to: 'spot bid (net)',
    direction: 'deposit',
    amountUsd: 125_000_000,
    price: 100_000,
    note: 'Bitcoin · 24h vol $125.0M (not a single whale tx)',
    timestamp: '2026-10-13T12:00:00.000Z',
  }, 'crypto');

  const copy = JSON.stringify({
    kpis: payload.kpis,
    whatItMeans: payload.whatItMeans,
    signalStack: payload.signalStack,
    stanceExplain: payload.stanceExplain,
    scorecard: payload.scorecard,
  });

  assert.deepEqual(Array.from(payload.signalStack, (chip) => chip.label), [
    'Trading volume',
    'Market activity',
    'Volume proxy',
  ]);
  assert.match(copy, /Reported volume|24h volume|trading-volume|market activity/i);
  assert.doesNotMatch(copy, /\bwhale\b|wallet|on-chain|transfer size|flow direction|large transfers/i);
});
