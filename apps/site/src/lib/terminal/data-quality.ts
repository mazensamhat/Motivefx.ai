export type EvidenceQuality = {
  provider: string; observedAt: string | null; freshness: "fresh" | "stale" | "unknown";
  kind: "observed" | "derived"; independentSources: number; confidence: number;
};
const MAX_AGE: Record<string, number> = {trades: 15*60_000, penny: 15*60_000, crypto: 15*60_000, betting: 15*60_000, predictions: 15*60_000};
export function evidenceQuality(module: string, row: Record<string, unknown>, provider: string, nowMs = Date.now()): EvidenceQuality {
  const time = Date.parse(String(row.timestamp ?? ""));
  const age = nowMs-time;
  const freshness = !Number.isFinite(time) || age < -60_000 ? "unknown" : age > (MAX_AGE[module] ?? 15*60_000) ? "stale" : "fresh";
  const derived = row.sourceType === "DERIVED" || /proxy|not a single whale|24h vol/i.test(String(row.note ?? ""));
  return {provider, observedAt: Number.isFinite(time) ? new Date(time).toISOString() : null, freshness,
    kind: derived ? "derived" : "observed", independentSources: 1,
    confidence: freshness === "stale" ? 20 : freshness === "unknown" ? 35 : derived ? 50 : 65};
}
export function rankOpportunity(item: Record<string, unknown>, tracked: Set<string>): number {
  const quality = item.dataQuality as EvidenceQuality | undefined;
  const symbol = String(item.symbol ?? "").toUpperCase();
  const relevant = tracked.has(symbol);
  const strength = Number(item.confidence ?? 50);
  const freshness = quality?.freshness === "fresh" ? 1 : quality?.freshness === "stale" ? .25 : .5;
  const stablecoin = item.module === "crypto" && ["USDT", "USDC"].includes(symbol);
  return (Number.isFinite(strength) ? strength : 50)*.45 + (quality?.confidence ?? 35)*.35 + freshness*15 + (relevant?20:0) - (stablecoin?15:0);
}
export function uniqueHeadlines<T extends {headline:string;timestamp:string}>(rows:T[], nowMs=Date.now()):T[] {
  const seen = new Set<string>();
  return [...rows].sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)).filter(row=>{
    const at = Date.parse(row.timestamp);
    const key = row.headline.toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
    if(!key || !Number.isFinite(at) || at>nowMs+60_000 || nowMs-at>7*24*60*60_000 || seen.has(key)) return false;
    seen.add(key); return true;
  });
}
export function isOpenPrediction(row: Record<string, unknown>, nowMs=Date.now()):boolean {
  if(row.closed===true || row.archived===true || row.active===false || row.acceptingOrders===false) return false;
  const end = row.endDate ?? row.endDateIso;
  return !end || (Number.isFinite(Date.parse(String(end))) && Date.parse(String(end))>nowMs);
}
