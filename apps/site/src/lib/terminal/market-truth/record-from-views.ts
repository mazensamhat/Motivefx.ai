/**
 * G1/G2 — persist Motive Signal evidence to the in-process ledger when views are built.
 */
import type { ProbabilityView } from "@/lib/terminal/engines/types";
import { allowsDemoFeeds } from "./data-mode";
import { wrapMarketEvidence } from "./evidence";
import { recordSignalEvidence } from "./evidence-ledger";

type FeedOpp = { id?: string; symbol?: string; module?: string; sourceReference?: string; sourceProvider?: string };

function resolveOpportunity(view: ProbabilityView, opportunities: FeedOpp[]): FeedOpp | undefined {
  const suffix = view.id.replace(/^opp-/, "");
  return opportunities.find((o) =>
    String(o.id ?? "") === suffix ||
    String(o.symbol ?? "").toUpperCase() === String(view.relatedSymbols?.[0] ?? "").toUpperCase()
  );
}

function evidenceMarket(module?: string) {
  if (module === "trades") return "stocks" as const;
  if (module === "penny" || module === "pinkslips") return "penny" as const;
  if (module === "crypto") return "crypto" as const;
  if (module === "betting") return "sports" as const;
  if (module === "predictions") return "predictions" as const;
  return "other" as const;
}

function resolveSymbol(view: ProbabilityView, opportunities: FeedOpp[]): string | undefined {
  const hit = resolveOpportunity(view, opportunities);
  if (hit?.symbol) return String(hit.symbol).toUpperCase();
  const fromRelated = view.relatedSymbols?.find((s) => s.trim());
  if (fromRelated) return fromRelated.toUpperCase();
  const suffix = view.id.replace(/^opp-/, "");
  return suffix ? suffix.toUpperCase() : undefined;
}

/** Record live opportunity views (`opp-*`) into the evidence ledger. */
export function recordProbabilityViewsToLedger(
  views: ProbabilityView[],
  opportunities: FeedOpp[] = []
): void {
  const demoMode = allowsDemoFeeds();

  for (const view of views) {
    if (!view.id.startsWith("opp-")) continue;
    const symbol = resolveSymbol(view, opportunities);
    if (!symbol) continue;
    const opportunity = resolveOpportunity(view, opportunities);
    const market = evidenceMarket(opportunity?.module ?? view.module);

    const evidence = (view.factors ?? []).map((f) =>
      wrapMarketEvidence({
        id: `${view.id}-${f.key}`,
        value: { factor: f.key, label: f.label, score: f.score, weight: f.weight },
        sourceType: demoMode ? "DEMO" : "LIVE",
        provider: opportunity?.sourceProvider ?? "motive-signal-engine",
        sourceReference: opportunity?.sourceReference,
        market,
        symbol,
        group: "PRICE_MOMENTUM",
        confidence: f.score,
        signalContribution: Math.round(f.score * f.weight),
      })
    );

    recordSignalEvidence({
      symbol,
      motiveSignal: view.probability,
      evidence,
    });
  }
}
