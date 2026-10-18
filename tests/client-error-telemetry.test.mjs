import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";

function loadRoute() {
  const calls = {
    envelopes: [],
    persisted: [],
    validatedFrames: [],
  };
  const deps = {
    crypto: { createHash },
    frames: {
      validateErrorFrames: (value) => {
        calls.validatedFrames.push(value);
        return Array.isArray(value)
          ? value.filter(
              (frame) =>
                typeof frame === "string" &&
                /^\/(?:terminal\/assets|_next\/static\/chunks)\/[A-Za-z0-9_.-]+\.js:\d{1,7}:\d{1,7}$/.test(frame),
            )
          : [];
      },
    },
    durable: {
      persistTelemetry: async (envelope) => {
        calls.persisted.push(envelope);
      },
    },
    telemetry: {
      buildTelemetryEnvelope: (envelope) => {
        calls.envelopes.push(envelope);
        return { persistedEnvelope: envelope };
      },
    },
  };

  let source = readFileSync(new URL("../apps/site/src/app/api/client-error/route.ts", import.meta.url), "utf8");
  source = source
    .replace('import { createHash } from "node:crypto";', "const { createHash } = deps.crypto;")
    .replace(
      'import { validateErrorFrames } from "../../../../../../packages/shared/src/error-frames";',
      "const { validateErrorFrames } = deps.frames;",
    )
    .replace('import { persistTelemetry } from "@/lib/ops/durable";', "const { persistTelemetry } = deps.durable;")
    .replace(
      'import { buildTelemetryEnvelope } from "@/lib/ops/telemetry-envelope";',
      "const { buildTelemetryEnvelope } = deps.telemetry;",
    )
    .replace('export const dynamic = "force-dynamic";', 'const dynamic = "force-dynamic";')
    .replace("export const maxDuration = 10;", "const maxDuration = 10;")
    .replace("export async function POST", "async function POST");

  assert.doesNotMatch(source, /^\s*(import|export)\s/m);

  const code = stripTypeScriptTypes(source);
  const route = new Function("deps", `${code}; return { POST, dynamic, maxDuration };`)(deps);
  return { ...route, calls };
}

function request(body, headers = {}) {
  return new Request("https://motive.test/api/client-error", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.10",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function readJson(response) {
  return { status: response.status, body: await response.json() };
}

test("client runtime errors persist only sanitized labels, paths, signatures, and trusted frames", async () => {
  const { POST, calls } = loadRoute();
  const sourceFrames = [
    "/terminal/assets/index-ABC.js:12:34",
    "/account/private.js:1:2",
    "/_next/static/chunks/app-client.js:98:7",
    "/terminal/assets/index-ABC.js:12:34?token=secret",
  ];

  const first = await readJson(
    await POST(
      request({
        platform: "iOS",
        surface: " Terminal / Home ",
        errorName: " TypeError: boom ",
        route: "https://motivefxai.com/terminal/portfolio/123456789?email=trader@example.test&token=secret",
        appVersion: " 1.2.3+prod build ",
        message: "Failed for trader@example.test at https://evil.example/secret?token=abc order 123456",
        sourceFrames,
      }),
    ),
  );
  const second = await readJson(
    await POST(
      request({
        platform: "ios",
        surface: "Terminal Home",
        errorName: "TypeError boom",
        route: "/terminal/portfolio/987654321?token=another",
        message: "Failed for other@example.test at https://another.example/private order 987654",
        sourceFrames,
      }),
    ),
  );

  assert.deepEqual(first, { status: 202, body: { ok: true, accepted: true } });
  assert.deepEqual(second, { status: 202, body: { ok: true, accepted: true } });
  assert.equal(calls.envelopes.length, 2);
  assert.equal(calls.persisted.length, 2);
  assert.deepEqual(calls.validatedFrames, [sourceFrames, sourceFrames]);

  const metadata = calls.envelopes[0].metadata;
  assert.equal(calls.envelopes[0].platform, "ios");
  assert.equal(calls.envelopes[0].appVersion, "1.2.3_prod_build");
  assert.equal(metadata.errorName, "TypeError_boom");
  assert.equal(metadata.surface, "Terminal_Home");
  assert.equal(metadata.route, "/terminal/portfolio/:id");
  assert.deepEqual(metadata.sourceFrames, [
    "/terminal/assets/index-ABC.js:12:34",
    "/_next/static/chunks/app-client.js:98:7",
  ]);

  assert.equal(metadata.messageSignature, calls.envelopes[1].metadata.messageSignature);
  assert.doesNotMatch(JSON.stringify(calls.persisted), /trader@example|other@example|evil\.example|another\.example|token=|123456|987654/);
});

test("oversized client error payloads are rejected before telemetry persistence", async () => {
  const { POST, calls } = loadRoute();

  const result = await readJson(
    await POST(
      request(
        { message: "small body but declared too large" },
        {
          "content-length": "8193",
          "x-forwarded-for": "203.0.113.20",
        },
      ),
    ),
  );

  assert.deepEqual(result, { status: 413, body: { ok: false, error: "Payload too large." } });
  assert.equal(calls.envelopes.length, 0);
  assert.equal(calls.persisted.length, 0);
});

test("client error rate limiting is scoped by forwarded client and skips persistence after the window budget", async () => {
  const { POST, calls } = loadRoute();

  for (let i = 0; i < 20; i += 1) {
    const result = await readJson(
      await POST(
        request(
          { platform: "web", route: `/terminal/${i}`, message: `boom ${i}` },
          { "x-forwarded-for": "198.51.100.7, 10.0.0.1" },
        ),
      ),
    );
    assert.deepEqual(result, { status: 202, body: { ok: true, accepted: true } });
  }

  const limited = await readJson(
    await POST(
      request(
        { platform: "web", route: "/terminal/limited", message: "should not persist" },
        { "x-forwarded-for": "198.51.100.7, 10.0.0.1" },
      ),
    ),
  );
  const otherClient = await readJson(
    await POST(
      request(
        { platform: "web", route: "/terminal/other", message: "other client can still report" },
        { "x-forwarded-for": "198.51.100.8" },
      ),
    ),
  );

  assert.deepEqual(limited, { status: 202, body: { ok: true, accepted: false, reason: "rate_limited" } });
  assert.deepEqual(otherClient, { status: 202, body: { ok: true, accepted: true } });
  assert.equal(calls.persisted.length, 21);
  assert.equal(calls.envelopes.at(-1).metadata.route, "/terminal/other");
  assert.ok(calls.envelopes.every((envelope) => envelope.metadata.route !== "/terminal/limited"));
});
