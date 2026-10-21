import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { loadSiteModule } from "./load-site-module.mjs";

async function loadClientErrorRoute({ now = Date.parse("2026-10-18T08:00:00.000Z") } = {}) {
  const calls = {
    envelopes: [],
    persisted: [],
  };
  let currentNow = now;
  const fakeDate = class extends Date {
    static now() {
      return currentNow;
    }
  };

  const frames = await loadSiteModule("../packages/shared/src/error-frames.ts");
  const route = await loadSiteModule(
    "../apps/site/src/app/api/client-error/route.ts",
    {
      "node:crypto": { createHash },
      "../../../../../../packages/shared/src/error-frames": frames,
      "@/lib/ops/durable": {
        persistTelemetry: async (envelope) => {
          calls.persisted.push(envelope);
        },
      },
      "@/lib/ops/telemetry-envelope": {
        buildTelemetryEnvelope: (input) => {
          calls.envelopes.push(input);
          return { eventId: `evt-${calls.envelopes.length}`, ...input };
        },
      },
    },
    "",
    { Date: fakeDate, Response }
  );

  return {
    ...route,
    calls,
    advance: (ms) => {
      currentNow += ms;
    },
  };
}

async function readJson(response) {
  return { status: response.status, body: await response.json() };
}

function expectedSignature(message) {
  const normalized = message
    .replace(/https?:\/\/\S+/gi, "[url]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/\b\d{4,}\b/g, "[n]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
  return createHash("sha256").update(normalized || "unknown").digest("hex").slice(0, 20);
}

test("client errors persist only privacy-safe telemetry labels and frames", async () => {
  const { POST, calls } = await loadClientErrorRoute();
  const request = new Request("https://motive.test/api/client-error", {
    method: "POST",
    body: JSON.stringify({
      platform: " IOS ",
      appVersion: " 2026.10 beta+private ",
      errorName: " TypeError<script> ",
      surface: " terminal/detail pane ",
      route: "https://motivefx.ai/terminal/assets/123456789?email=private@example.test#secret",
      message: "Payment failed for private@example.test at https://secret.example/token?id=123456",
      sourceFrames: [
        "/terminal/assets/app-abc.js:12:34",
        "https://evil.example/private.js:1:2?token=secret",
        "/_next/static/chunks/page.js:56:78",
        "/account/private.js:1:2",
      ],
    }),
  });

  const result = await readJson(await POST(request));

  assert.deepEqual(result, { status: 202, body: { ok: true, accepted: true } });
  assert.equal(calls.persisted.length, 1);
  assert.equal(calls.persisted[0].eventId, "evt-1");
  assert.equal(JSON.stringify(calls.persisted[0].metadata), JSON.stringify(calls.envelopes[0].metadata));
  assert.equal(calls.envelopes[0].eventName, "client.error");
  assert.equal(calls.envelopes[0].product, "motivefx");
  assert.equal(calls.envelopes[0].platform, "ios");
  assert.equal(calls.envelopes[0].appVersion, "2026.10_beta_private");
  assert.equal(calls.envelopes[0].status, "error");
  assert.equal(calls.envelopes[0].errorCode, "CLIENT_RUNTIME_ERROR");
  assert.equal(calls.envelopes[0].sourceClass, "user");
  assert.equal(calls.envelopes[0].privacyClass, "internal");
  assert.deepEqual(JSON.parse(JSON.stringify(calls.envelopes[0].metadata)), {
    errorName: "TypeError_script_",
    surface: "terminal_detail_pane",
    route: "/terminal/assets/:id",
    messageSignature: expectedSignature(
      "Payment failed for private@example.test at https://secret.example/token?id=123456"
    ),
    sourceFrames: ["/terminal/assets/app-abc.js:12:34", "/_next/static/chunks/page.js:56:78"],
  });
  assert.doesNotMatch(JSON.stringify(calls.envelopes[0]), /private@example|secret\.example|token=secret/);
});

test("oversized client error payloads are rejected before persistence", async () => {
  const { POST, calls } = await loadClientErrorRoute();
  const request = new Request("https://motive.test/api/client-error", {
    method: "POST",
    headers: { "content-length": "8193" },
    body: "{not json",
  });

  const result = await readJson(await POST(request));

  assert.deepEqual(result, { status: 413, body: { ok: false, error: "Payload too large." } });
  assert.deepEqual(calls.envelopes, []);
  assert.deepEqual(calls.persisted, []);
});

test("client error intake rate limits each forwarded client window", async () => {
  const { POST, calls, advance } = await loadClientErrorRoute();

  for (let index = 0; index < 20; index += 1) {
    const response = await POST(
      new Request("https://motive.test/api/client-error", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.2" },
        body: JSON.stringify({ platform: "web", message: `failure ${index}` }),
      })
    );
    assert.equal(response.status, 202);
    assert.equal((await response.json()).accepted, true);
  }

  const limited = await readJson(
    await POST(
      new Request("https://motive.test/api/client-error", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.2" },
        body: JSON.stringify({ platform: "web", message: "limited" }),
      })
    )
  );
  assert.deepEqual(limited, { status: 202, body: { ok: true, accepted: false, reason: "rate_limited" } });
  assert.equal(calls.persisted.length, 20);

  const otherClient = await readJson(
    await POST(
      new Request("https://motive.test/api/client-error", {
        method: "POST",
        headers: { "x-forwarded-for": "198.51.100.44" },
        body: JSON.stringify({ platform: "web", message: "other client" }),
      })
    )
  );
  assert.equal(otherClient.body.accepted, true);
  assert.equal(calls.persisted.length, 21);

  advance(60_000);
  const reset = await readJson(
    await POST(
      new Request("https://motive.test/api/client-error", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.10" },
        body: JSON.stringify({ platform: "web", message: "window reset" }),
      })
    )
  );
  assert.equal(reset.body.accepted, true);
  assert.equal(calls.persisted.length, 22);
});
