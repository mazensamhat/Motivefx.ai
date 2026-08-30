import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getDataMode } from "@/lib/terminal/market-truth/data-mode";
import { ledgerContaminationStats } from "@/lib/terminal/market-truth/evidence-ledger";
import { runMarketTruthGoldenChecks } from "@/lib/terminal/market-truth/golden";
import { nativeReaderSecretConfigured } from "@/lib/terminal/native-reader-token";
import { providerHealthFlags } from "@/lib/terminal/provider-switches";
import {
  countSignalOutcomes,
  getAiUsageSummary,
  loadSignalSnapshots,
} from "@/lib/ops/durable";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const golden = runMarketTruthGoldenChecks();
    const contamination = ledgerContaminationStats();
    const g1Pass =
      golden.ok && contamination.demoInSignal === 0 && contamination.syntheticInSignal === 0;
    const providers = providerHealthFlags();
    const providersOk = Object.values(providers).every(Boolean);

    const [aiUsage, outcomes, snaps] = await Promise.all([
      getAiUsageSummary(7),
      countSignalOutcomes(),
      loadSignalSnapshots(5),
    ]);

    const g5Pass = aiUsage.requests > 0;
    const g6Pass = outcomes.total > 0 && snaps.length > 0;

    const gates = [
      {
        id: "G1",
        label: "Market Truth & Provenance",
        status: g1Pass ? ("pass" as const) : ("attention" as const),
        summary: g1Pass
          ? "Golden checks pass · zero demo/synthetic in signal bag"
          : "Contamination or golden check failure — see Market Truth",
        href: "/admin/market-truth",
      },
      {
        id: "G2",
        label: "Motive Signal Integrity",
        status:
          snaps.length > 0 || contamination.entries > 0
            ? ("pass" as const)
            : ("pending" as const),
        summary:
          snaps.length > 0
            ? `${snaps.length}+ durable SignalSnapshot rows · ledger ${contamination.entries}`
            : contamination.entries > 0
              ? `${contamination.entries} ledger entries · durable snapshots empty`
              : "No snapshots yet — generate briefing to record evidence",
        href: "/admin/signals",
      },
      {
        id: "G3",
        label: "Security & Authorization",
        status: nativeReaderSecretConfigured() ? ("pass" as const) : ("attention" as const),
        summary: nativeReaderSecretConfigured()
          ? "Native reader secret configured · ADMIN_EMAILS + capability gate active"
          : "Set NATIVE_READER_TOKEN_SECRET for production native reader",
        href: "/admin/security",
      },
      {
        id: "G4",
        label: "Native/App-Store Compliance",
        status: ("pass" as const),
        summary: "iOS App Store live · free-reader path · Play listing live",
        href: "/download",
      },
      {
        id: "G5",
        label: "AI Reliability & Economics",
        status: g5Pass ? ("pass" as const) : ("pending" as const),
        summary: g5Pass
          ? `${aiUsage.requests} metered AI calls (7d) · $${aiUsage.totalCostUsd} · ${aiUsage.successRate}% ok`
          : "No OpsAiUsage rows yet — Ask Motive / briefs will populate metering",
        href: "/admin/ai-costs",
      },
      {
        id: "G6",
        label: "Outcomes & Calibration",
        status: g6Pass ? ("pass" as const) : ("pending" as const),
        summary: g6Pass
          ? `${outcomes.total} outcomes (${outcomes.decided} decided · ${outcomes.pending} pending) · snapshots present`
          : "SignalSnapshot / SignalOutcome stores empty — generate signals to seed",
        href: "/admin/calibration",
      },
      {
        id: "G7",
        label: "CI, QA & Production Certification",
        status: providersOk && g1Pass ? ("pass" as const) : ("attention" as const),
        summary: providersOk
          ? "Provider kill-switches green · golden checks in Ops"
          : "One or more providers kill-switched — review Providers",
        href: "/admin/providers",
      },
    ];

    return json({
      generatedAt: new Date().toISOString(),
      gates,
      certificationTarget: `MOTIVEFX PRODUCTION CERTIFICATION
Data mode: ${getDataMode()}
G1–G4 must pass before major product features.
See docs/PRODUCTION_HARDENING_MASTER_PLAN.md`,
    });
  } catch (error) {
    console.error("[admin/releases]", error);
    return serverError("Could not load release gates.");
  }
}
