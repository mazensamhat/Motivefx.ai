import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getDataMode } from "@/lib/terminal/market-truth/data-mode";
import {
  getRecentLedgerEntries,
  MOTIVE_SIGNAL_ENGINE_VERSION,
} from "@/lib/terminal/market-truth/evidence-ledger";
import { runMarketTruthGoldenChecks } from "@/lib/terminal/market-truth/golden";
import { buildMarketTruthControlRoom } from "@/lib/ops/market-truth-control";
import { TRUTH_STATES } from "@/lib/ops/truth-state";
import { recordTelemetry } from "@/lib/ops/telemetry-envelope";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const url = new URL(request.url);
    const symbol = url.searchParams.get("symbol")?.trim() || undefined;
    const golden = runMarketTruthGoldenChecks();
    const control = buildMarketTruthControlRoom(symbol);
    const recentLedger = getRecentLedgerEntries(25).map((entry) => ({
      ledgerId: entry.ledgerId,
      recordedAt: entry.recordedAt,
      symbol: entry.symbol,
      motiveSignal: entry.motiveSignal,
      engineVersion: entry.engineVersion,
      evidenceCount: entry.evidence.length,
      signalEvidenceCount: entry.signalEvidence.length,
    }));

    recordTelemetry({
      eventName: "ops.sensitive_data.viewed",
      userId: auth.session.id,
      sourceClass: "ops",
      privacyClass: "internal",
      metadata: { surface: "market-truth", symbol: symbol ?? null },
    });

    return json({
      generatedAt: new Date().toISOString(),
      dataMode: getDataMode(),
      engineVersion: MOTIVE_SIGNAL_ENGINE_VERSION,
      golden,
      contamination: control.contamination,
      truthStates: TRUTH_STATES,
      truthStateCounts: control.truthStateCounts,
      freshness: control.freshness,
      assets: control.assets,
      provenanceSamples: control.provenanceSamples,
      rightsBlocked: control.rightsBlocked,
      symbolFilter: symbol ?? null,
      recentLedger,
    });
  } catch (error) {
    console.error("[admin/market-truth]", error);
    return serverError("Could not load market truth.");
  }
}
