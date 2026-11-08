import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';

// Load the real TypeScript routes without a Next server or network services.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const candidate = specifier.startsWith('@/')
      ? new URL(`../src/${specifier.slice(2)}`, import.meta.url)
      : specifier.startsWith('.') ? new URL(specifier, context.parentURL) : null;
    if (candidate) {
      for (const suffix of ['', '.ts', '/index.ts']) {
        const url = new URL(candidate.href + suffix);
        if (existsSync(url) && /\.(ts|tsx)$/.test(url.pathname)) {
          return { url: url.href, shortCircuit: true };
        }
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && /\.(ts|tsx)$/.test(url)) {
      return {
        format: 'module', shortCircuit: true,
        source: stripTypeScriptTypes(readFileSync(new URL(url), 'utf8'), { sourceUrl: fileURLToPath(url) }),
      };
    }
    return nextLoad(url, context);
  },
});

const { default: sitemap } = await import('../src/app/sitemap.ts');
const { SITE } = await import('../src/lib/site-config.ts');
const { metadata, default: PricingLayout } = await import('../src/app/pricing/layout.tsx');

test('sitemap preserves public coverage and excludes private routes', () => {
  const entries = sitemap();
  assert.ok(entries.length >= 128, 'retain baseline coverage while allowing new public pages');
  assert.equal(new Set(entries.map(entry => entry.url)).size, entries.length);
  assert.ok(entries.some(entry => entry.url === `${SITE.url}/pricing`));
  for (const entry of entries) {
    assert.equal(new URL(entry.url).origin, new URL(SITE.url).origin);
    assert.doesNotMatch(new URL(entry.url).pathname, /^\/(app|admin|api|login|register|terminal)(\/|$)/);
  }
});

test('sitemap omits unsupported modification dates and is deterministic', () => {
  const entries = sitemap();
  assert.ok(entries.every(entry => !Object.hasOwn(entry, 'lastModified')));
  assert.deepEqual(sitemap(), entries);
});

test('pricing declares its own canonical and preserves client page children', () => {
  assert.equal(metadata.alternates.canonical, `${SITE.url}/pricing`);
  assert.equal(metadata.openGraph.url, `${SITE.url}/pricing`);
  const children = { unchanged: true };
  assert.equal(PricingLayout({ children }), children);
});
