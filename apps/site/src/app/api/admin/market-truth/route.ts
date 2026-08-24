import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getDataMode } from "@/lib/terminal/market-truth/data-mode";
import {
  getRecentLedgerEntries,
  ledgerContaminationStats,
  MOTIVE_SIGNAL_ENGINE_VERSION,
} from "@/lib/terminal/market-truth/evidence-ledger";
import { runMarketTruthGoldenChecks } from "@/lib/terminal/market-truth/golden";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const golden = runMarketTruthGoldenChecks();
    const contamination = ledgerContaminationStats();
    const recentLedger = getRecentLedgerEntries(25).map((entry) => ({
      ledgerId: entry.ledgerId,
      recordedAt: entry.recordedAt,
      symbol: entry.symbol,
      motiveSignal: entry.motiveSignal,
      engineVersion: entry.engineVersion,
      evidenceCount: entry.evidence.length,
      signalEvidenceCount: entry.signalEvidence.length,
    }));

    return json({
      generatedAt: new Date().toISOString(),
      dataMode: getDataMode(),
      engineVersion: MOTIVE_SIGNAL_ENGINE_VERSION,
      golden,
      contamination,
      recentLedger,
    });
  } catch (error) {
    console.error("[admin/market-truth]", error);
    return serverError("Could not load market truth.");
  }
}
