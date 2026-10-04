import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";

const harnessKey = "__motiveSignalPersistenceTest";
globalThis[harnessKey] = {};

function moduleUrl(source, label) {
  return `data:text/javascript;base64,${Buffer.from(`// ${label}\n${source}`).toString("base64")}`;
}

function isProductionSignalEligible(ev) {
  return (
    !ev.simulation &&
    ev.sourceType !== "DEMO" &&
    ev.sourceType !== "SYNTHETIC" &&
    ev.freshness !== "EXPIRED" &&
    Boolean(ev.provider?.trim()) &&
    ["LIVE", "DELAYED", "DERIVED", "MODEL"].includes(ev.sourceType)
  );
}

async function loadLedgerModule(label) {
  let source = await readFile(
    new URL("../apps/site/src/lib/terminal/market-truth/evidence-ledger.ts", import.meta.url),
    "utf8"
  );
  source = source
    .replace('import type { MarketEvidence } from "./types";\n', "")
    .replace('import { assertProductionEvidence } from "./types";\n', "")
    .replace('import { filterForProductionSignal } from "./evidence";\n', "")
    .replace(
      'const persistence = import("@/lib/ops/durable")',
      `const persistence = Promise.resolve(globalThis.${harnessKey}.durable)`
    );
  source =
    `const { assertProductionEvidence, filterForProductionSignal } = globalThis.${harnessKey};\n` +
    stripTypeScriptTypes(source);
  return import(moduleUrl(source, label));
}

async function loadDurableModule(label) {
  let source = await readFile(new URL("../apps/site/src/lib/ops/durable.ts", import.meta.url), "utf8");
  source = source
    .replace('import { prisma } from "@motivefx/database";', `const prisma = globalThis.${harnessKey}.prisma;`)
    .replace('import type { TelemetryEnvelope } from "./telemetry-envelope";\n', "")
    .replace('import type { AuditRecord } from "./audit";\n', "")
    .replace(
      'import { classifyMotiveStance } from "@/lib/terminal/market-truth/signal-confluence";',
      `const classifyMotiveStance = globalThis.${harnessKey}.classifyMotiveStance;`
    );
  return import(moduleUrl(stripTypeScriptTypes(source), label));
}

function installMockDate(t, iso) {
  const RealDate = globalThis.Date;
  let now = RealDate.parse(iso);
  class MockDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(now);
      } else {
        super(...args);
      }
    }

    static now() {
      return now;
    }
  }
  globalThis.Date = MockDate;
  t.after(() => {
    globalThis.Date = RealDate;
  });
  return (nextIso) => {
    now = RealDate.parse(nextIso);
  };
}

function installImmediateTimers(t) {
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn, ...args) => {
    fn(...args);
    return 0;
  };
  t.after(() => {
    globalThis.setTimeout = realSetTimeout;
  });
}

function evidence(id, overrides = {}) {
  return {
    id,
    value: { price: 100 },
    sourceType: "LIVE",
    provider: "finnhub",
    sourceReference: `ref:${id}`,
    observedAt: "2026-10-04T08:10:00.000Z",
    fetchedAt: "2026-10-04T08:10:01.000Z",
    ageSeconds: 1,
    freshness: "FRESH",
    confidence: 88,
    derived: false,
    simulation: false,
    market: "stocks",
    symbol: "NVDA",
    signalContribution: 12,
    ...overrides,
  };
}

function setupLedgerHarness(persisted) {
  globalThis[harnessKey].assertProductionEvidence = isProductionSignalEligible;
  globalThis[harnessKey].filterForProductionSignal = (items) => items.filter(isProductionSignalEligible);
  globalThis[harnessKey].durable = {
    persistSignalSnapshot: async (row) => {
      persisted.push(row);
    },
  };
}

test("signal ledger keys one logical score state per UTC minute despite evidence jitter", async (t) => {
  const persisted = [];
  setupLedgerHarness(persisted);
  const setNow = installMockDate(t, "2026-10-04T08:10:30.123Z");
  const { flushSignalEvidencePersistence, recordSignalEvidence } = await loadLedgerModule("ledger-dedupe");

  const first = recordSignalEvidence({
    symbol: "nvda",
    motiveSignal: 78,
    engineVersion: "TEST_ENGINE",
    evidence: [evidence("price-a", { value: { price: 100 }, sourceReference: "tick:a" })],
  });
  const jittered = recordSignalEvidence({
    symbol: "NVDA",
    motiveSignal: 78,
    engineVersion: "TEST_ENGINE",
    evidence: [evidence("price-b", { value: { price: 100.2 }, sourceReference: "tick:b" })],
  });

  setNow("2026-10-04T08:11:00.000Z");
  const nextMinute = recordSignalEvidence({
    symbol: "nvda",
    motiveSignal: 78,
    engineVersion: "TEST_ENGINE",
    evidence: [evidence("price-c")],
  });
  const differentScore = recordSignalEvidence({
    symbol: "nvda",
    motiveSignal: 79,
    engineVersion: "TEST_ENGINE",
    evidence: [evidence("price-d")],
  });

  await flushSignalEvidencePersistence();

  assert.equal(first.symbol, "NVDA");
  assert.equal(first.ledgerId, jittered.ledgerId);
  assert.notEqual(first.ledgerId, nextMinute.ledgerId);
  assert.notEqual(nextMinute.ledgerId, differentScore.ledgerId);
  assert.equal(persisted.length, 4);
  assert.equal(persisted[0].ledgerId, persisted[1].ledgerId);
  assert.equal(persisted[0].signalEvidence[0].sourceReference, "tick:a");
  assert.equal(persisted[1].signalEvidence[0].sourceReference, "tick:b");
});

test("signal ledger persists all evidence while filtering production signal evidence", async (t) => {
  const persisted = [];
  setupLedgerHarness(persisted);
  installMockDate(t, "2026-10-04T08:12:00.000Z");
  const { flushSignalEvidencePersistence, recordSignalEvidence } = await loadLedgerModule("ledger-filtering");

  const entry = recordSignalEvidence({
    symbol: "eth",
    motiveSignal: 64,
    evidence: [
      evidence("live", { market: "crypto", symbol: "ETH" }),
      evidence("demo", { sourceType: "DEMO", simulation: true, market: "crypto", symbol: "ETH" }),
      evidence("expired", { freshness: "EXPIRED", market: "crypto", symbol: "ETH" }),
      evidence("missing-provider", { provider: " ", market: "crypto", symbol: "ETH" }),
    ],
  });

  await flushSignalEvidencePersistence();

  assert.deepEqual(entry.signalEvidence.map((ev) => ev.id), ["live"]);
  assert.equal(entry.evidence.length, 4);
  assert.deepEqual(persisted[0].signalEvidence.map((ev) => ev.id), ["live"]);
  assert.equal(persisted[0].evidence.length, 4);
});

test("durable signal persistence upserts snapshots and deterministic outcomes", async () => {
  const snapshotUpserts = [];
  const outcomeUpserts = [];
  globalThis[harnessKey].classifyMotiveStance = (score) => (score >= 60 ? "BULLISH" : "BEARISH");
  globalThis[harnessKey].prisma = {
    signalSnapshot: {
      upsert: async (args) => {
        snapshotUpserts.push(args);
        return { id: "snapshot-42" };
      },
    },
    signalOutcome: {
      upsert: async (args) => {
        outcomeUpserts.push(args);
      },
    },
  };
  const { persistSignalSnapshot } = await loadDurableModule("durable-upsert");

  const input = {
    ledgerId: "NVDA-29859530-abc123",
    symbol: "NVDA",
    motiveSignal: 78,
    engineVersion: "TEST_ENGINE",
    evidence: [evidence("price-a")],
    signalEvidence: [evidence("price-a", { market: "stocks", sourceReference: "tick:a" })],
    recordedAt: "2026-10-04T08:10:30.123Z",
  };
  await persistSignalSnapshot(input);
  await persistSignalSnapshot({
    ...input,
    evidence: [evidence("price-b")],
    signalEvidence: [evidence("price-b", { market: "stocks", sourceReference: "tick:b" })],
  });

  assert.equal(snapshotUpserts.length, 2);
  assert.deepEqual(snapshotUpserts.map((args) => args.where), [{ ledgerId: input.ledgerId }, { ledgerId: input.ledgerId }]);
  assert.equal(snapshotUpserts[0].create.ledgerId, input.ledgerId);
  assert.equal(snapshotUpserts[1].update.evidenceJson, JSON.stringify([evidence("price-b")]));
  assert.equal(snapshotUpserts[1].update.signalEvidenceJson, JSON.stringify([evidence("price-b", { market: "stocks", sourceReference: "tick:b" })]));
  assert.equal(outcomeUpserts.length, 2);
  assert.deepEqual(outcomeUpserts[0].where, { id: "signal-outcome:snapshot-42:30:MARKET_OUTCOME_V4" });
  assert.equal(outcomeUpserts[0].create.snapshotId, "snapshot-42");
  assert.equal(outcomeUpserts[0].create.symbol, "NVDA");
  assert.match(outcomeUpserts[0].create.notes, /^SOURCE_META:/);
  assert.deepEqual(outcomeUpserts[1].update, {});
});

test("durable signal persistence retries transient pool failures before seeding one outcome", async (t) => {
  installImmediateTimers(t);
  let snapshotAttempts = 0;
  const outcomeUpserts = [];
  globalThis[harnessKey].classifyMotiveStance = () => "BULLISH";
  globalThis[harnessKey].prisma = {
    signalSnapshot: {
      upsert: async () => {
        snapshotAttempts += 1;
        if (snapshotAttempts === 1) {
          throw Object.assign(new Error("pool closed"), { code: "P2024" });
        }
        return { id: "snapshot-retry" };
      },
    },
    signalOutcome: {
      upsert: async (args) => {
        outcomeUpserts.push(args);
      },
    },
  };
  const { persistSignalSnapshot } = await loadDurableModule("durable-retry");

  await persistSignalSnapshot({
    ledgerId: "NVDA-29859530-retry",
    symbol: "NVDA",
    motiveSignal: 78,
    engineVersion: "TEST_ENGINE",
    evidence: [evidence("price-a")],
    signalEvidence: [evidence("price-a")],
    recordedAt: "2026-10-04T08:10:30.123Z",
  });

  assert.equal(snapshotAttempts, 2);
  assert.equal(outcomeUpserts.length, 1);
  assert.deepEqual(outcomeUpserts[0].where, { id: "signal-outcome:snapshot-retry:30:MARKET_OUTCOME_V4" });
});
