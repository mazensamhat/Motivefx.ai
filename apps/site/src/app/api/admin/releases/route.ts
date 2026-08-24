import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getDataMode } from "@/lib/terminal/market-truth/data-mode";
import { ledgerContaminationStats } from "@/lib/terminal/market-truth/evidence-ledger";
import { runMarketTruthGoldenChecks } from "@/lib/terminal/market-truth/golden";
import { nativeReaderSecretConfigured } from "@/lib/terminal/native-reader-token";
import { providerHealthFlags } from "@/lib/terminal/provider-switches";

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
        status: contamination.entries > 0 ? ("pass" as const) : ("pending" as const),
        summary:
          contamination.entries > 0
            ? `${contamination.entries} ledger entries · demo priors blocked in PRODUCTION`
            : "Ledger empty — generate briefing to record evidence",
        href: "/admin/signals",
      },
      {
        id: "G3",
        label: "Security & Authorization",
        status: nativeReaderSecretConfigured() ? ("pass" as const) : ("attention" as const),
        summary: nativeReaderSecretConfigured()
          ? "Native reader secret configured · ADMIN_EMAILS gate active"
          : "Set NATIVE_READER_TOKEN_SECRET for production native reader",
        href: "/admin/security",
      },
      {
        id: "G4",
        label: "Native/App-Store Compliance",
        status: ("pending" as const),
        summary: "ChannelCapabilities + claim registry — see hardening plan",
        href: "https://github.com/mazensamhat/Motivefx.ai/blob/main/docs/PRODUCTION_HARDENING_MASTER_PLAN.md",
      },
      {
        id: "G5",
        label: "AI Reliability & Economics",
        status: ("pending" as const),
        summary: "MotiveBriefingContext budgets · token metering not yet in admin API",
        href: "/admin/ai-costs",
      },
      {
        id: "G6",
        label: "Outcomes & Calibration",
        status: ("pending" as const),
        summary: "Signal Snapshots + outcome engine — durable DB ledger pending",
        href: "/admin/market-truth",
      },
      {
        id: "G7",
        label: "CI, QA & Production Certification",
        status: providersOk ? ("attention" as const) : ("attention" as const),
        summary: "Golden tests in CI · release-gate automation pending",
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
