import type { Recommendation } from "../types";

/** Average recommendation confidence — displayed as calculated win-rate in hero gauge */
export function calcWinRate(recommendations?: Recommendation[]): number | undefined {
  if (!recommendations?.length) return undefined;
  const sum = recommendations.reduce((acc, r) => acc + r.confidence, 0);
  return Math.round(sum / recommendations.length);
}
