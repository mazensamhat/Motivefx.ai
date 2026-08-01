/** User-facing terminology — avoid regulated adviser / portfolio-manager language in UI copy. */
export const PRODUCT_TAGLINE =
  "AI-powered market intelligence, research, analytics, and tracking platform";

export const LABELS = {
  holdingsLedger: "Holdings Ledger",
  holdingsOverview: "Holdings Overview",
  cryptoHoldings: "Crypto Holdings",
  pinkSlipHoldings: "Pink Slip Holdings",
  signalStrength: "Desk attention",
  aiConfidence: "AI confidence",
  marketIntelligence: "Market intelligence",
} as const;

export function formatSignalStrength(pct: number): string {
  return `${pct}% desk attention`;
}

export function formatAiConfidence(pct: number): string {
  return `${pct}% AI confidence`;
}
