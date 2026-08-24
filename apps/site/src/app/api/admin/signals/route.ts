import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { classifyMotiveStance } from "@/lib/terminal/market-truth/signal-confluence";
import { allowsDemoFeeds, getDataMode } from "@/lib/terminal/market-truth/data-mode";
import {
  getRecentLedgerEntries,
  ledgerContaminationStats,
  MOTIVE_SIGNAL_ENGINE_VERSION,
} from "@/lib/terminal/market-truth/evidence-ledger";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const entries = getRecentLedgerEntries(100);
    const contamination = ledgerContaminationStats();
    const stanceCounts: Record<string, number> = {};
    const symbolCounts: Record<string, number> = {};
    let lowConfidence = 0;
    let highSignal = 0;

    for (const entry of entries) {
      const score = entry.motiveSignal ?? 0;
      const stance = classifyMotiveStance(score);
      stanceCounts[stance] = (stanceCounts[stance] ?? 0) + 1;
      symbolCounts[entry.symbol] = (symbolCounts[entry.symbol] ?? 0) + 1;
      if (score < 45) lowConfidence += 1;
      if (score >= 70) highSignal += 1;
    }

    const suppression = {
      demoPriorsBlocked: !allowsDemoFeeds(),
      demoInSignalBag: contamination.demoInSignal,
      syntheticInSignalBag: contamination.syntheticInSignal,
      lowConfidenceSignals: lowConfidence,
      dataMode: getDataMode(),
    };

    const distribution = Object.entries(stanceCounts)
      .map(([stance, count]) => ({ stance, count }))
      .sort((a, b) => b.count - a.count);

    const topSymbols = Object.entries(symbolCounts)
      .map(([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    return json({
      generatedAt: new Date().toISOString(),
      engineVersion: MOTIVE_SIGNAL_ENGINE_VERSION,
      totals: {
        ledgerEntries: entries.length,
        highSignal,
        lowConfidence,
        uniqueSymbols: Object.keys(symbolCounts).length,
      },
      distribution,
      topSymbols,
      suppression,
      recentLedger: entries.slice(0, 25).map((entry) => ({
        ledgerId: entry.ledgerId,
        recordedAt: entry.recordedAt,
        symbol: entry.symbol,
        motiveSignal: entry.motiveSignal,
        stance: entry.motiveSignal != null ? classifyMotiveStance(entry.motiveSignal) : null,
        evidenceCount: entry.evidence.length,
        signalEvidenceCount: entry.signalEvidence.length,
      })),
    });
  } catch (error) {
    console.error("[admin/signals]", error);
    return serverError("Could not load signal ops.");
  }
}
