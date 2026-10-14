import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { loadSiteModule } from './load-site-module.mjs';

async function loadRoute({ now = 1_800_000_000_000 } = {}) {
  const events = [];
  let fakeNow = now;
  const frames = await loadSiteModule('../packages/shared/src/error-frames.ts');
  const route = await loadSiteModule(
    '../apps/site/src/app/api/client-error/route.ts',
    {
      'node:crypto': { createHash },
      '../../../../../../packages/shared/src/error-frames': frames,
      '@/lib/ops/durable': {
        persistTelemetry: async (event) => {
          events.push(event);
        },
      },
      '@/lib/ops/telemetry-envelope': {
        buildTelemetryEnvelope: (event) => ({ id: `event-${events.length + 1}`, ...event }),
      },
    },
    '',
    {
      Response,
      Date: class extends Date {
        static now() {
          return fakeNow;
        }
      },
    }
  );
  return {
    events,
    route,
    advance(ms) {
      fakeNow += ms;
    },
  };
}

function request(body, headers = {}) {
  return new Request('https://motivefx.test/api/client-error', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

test('client error ingestion strips sensitive route and stack details before persistence', async () => {
  const { events, route } = await loadRoute();
  const base = {
    platform: 'ios',
    surface: 'terminal.react boundary',
    errorName: 'TypeError!',
    appVersion: '1.2.3+456',
    route: 'https://motivefx.ai/terminal/account/123456?email=owner@example.test#secret',
    sourceFrames: [
      '/terminal/assets/index-ABC123.js:12:34',
      '/account/private.js:1:2',
      '/_next/static/chunks/app-client.js:98:76?token=secret',
    ],
  };

  const first = await route.POST(
    request({
      ...base,
      message: 'Failed for owner@example.test at https://private.example/path/123456',
    })
  );
  const second = await route.POST(
    request({
      ...base,
      route: '/terminal/account/999999?token=other',
      message: 'Failed for buyer@example.test at https://another.example/path/987654',
    })
  );

  assert.equal(first.status, 202);
  assert.equal((await first.json()).accepted, true);
  assert.equal(second.status, 202);
  assert.equal(events.length, 2);
  assert.equal(events[0].eventName, 'client.error');
  assert.equal(events[0].platform, 'ios');
  assert.equal(events[0].appVersion, '1.2.3_456');
  assert.deepEqual(JSON.parse(JSON.stringify(events[0].metadata)), {
    errorName: 'TypeError_',
    surface: 'terminal.react_boundary',
    route: '/terminal/account/:id',
    messageSignature: events[1].metadata.messageSignature,
    sourceFrames: ['/terminal/assets/index-ABC123.js:12:34'],
  });
  assert.match(events[0].metadata.messageSignature, /^[0-9a-f]{20}$/);
  assert.doesNotMatch(JSON.stringify(events), /owner@example|buyer@example|private\.example|token|secret/);
});

test('client error ingestion rate limits noisy clients without parsing oversized payloads', async () => {
  const { events, route, advance } = await loadRoute();
  const body = { platform: 'web', surface: 'terminal.window', message: 'looping failure' };

  for (let i = 0; i < 20; i += 1) {
    const response = await route.POST(request(body, { 'x-forwarded-for': '203.0.113.10' }));
    assert.equal(response.status, 202);
    assert.equal((await response.json()).accepted, true);
  }

  const limited = await route.POST(request(body, { 'x-forwarded-for': '203.0.113.10' }));
  assert.equal(limited.status, 202);
  assert.deepEqual(await limited.json(), { ok: true, accepted: false, reason: 'rate_limited' });
  assert.equal(events.length, 20);

  advance(60_000);
  const afterWindow = await route.POST(request(body, { 'x-forwarded-for': '203.0.113.10' }));
  assert.equal((await afterWindow.json()).accepted, true);
  assert.equal(events.length, 21);

  const oversized = await route.POST(
    new Request('https://motivefx.test/api/client-error', {
      method: 'POST',
      headers: { 'content-length': '8193' },
    })
  );
  assert.equal(oversized.status, 413);
  assert.equal(events.length, 21);
});
