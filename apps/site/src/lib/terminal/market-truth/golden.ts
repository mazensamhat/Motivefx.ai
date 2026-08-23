/**
 * G1 golden invariants — callable without a test runner until G7 CI lands.
 */
import {
  countContamination,
  productionTruthPass,
  wrapMarketEvidence,
  type MarketEvidence,
} from "./index";

export function goldenDemoContaminationRejected(): boolean {
  const bag: MarketEvidence[] = [
    wrapMarketEvidence({
      id: "demo-nvda",
      value: { symbol: "NVDA" },
      sourceType: "DEMO",
      provider: "demo",
      market: "stocks",
      symbol: "NVDA",
      group: "OPTIONS_FLOW",
      signalContribution: 8,
    }),
  ];
  const filtered = bag.filter((e) => e.sourceType !== "DEMO" && e.sourceType !== "SYNTHETIC");
  return filtered.length === 0 && !productionTruthPass(bag);
}

export function goldenLiveEvidencePasses(): boolean {
  const bag: MarketEvidence[] = [
    wrapMarketEvidence({
      id: "live-aapl",
      value: { symbol: "AAPL" },
      sourceType: "LIVE",
      provider: "finnhub",
      market: "stocks",
      symbol: "AAPL",
      group: "DISCLOSURES",
      confidence: 70,
      signalContribution: 5,
    }),
  ];
  const c = countContamination(bag);
  return productionTruthPass(bag) && c.demo === 0 && c.synthetic === 0;
}

export function runMarketTruthGoldenChecks(): {
  ok: boolean;
  checks: Record<string, boolean>;
} {
  const checks = {
    demoContaminationRejected: goldenDemoContaminationRejected(),
    liveEvidencePasses: goldenLiveEvidencePasses(),
  };
  return { ok: Object.values(checks).every(Boolean), checks };
}
