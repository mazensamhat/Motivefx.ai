import type { HomeOpportunity, ProbabilityView, TabId } from "../types";

export type OpportunityKind = "trades" | "crypto" | "penny" | "betting" | "predictions";
export type SaveDraft = { pick: string; sport: string; category: string; odds: string; sportsbook: string; yesCents: string };
export const EMPTY_SAVE_DRAFT: SaveDraft = { pick: "", sport: "", category: "", odds: "", sportsbook: "", yesCents: "" };
const KINDS: Record<string, OpportunityKind> = {
  stocks: "trades", trades: "trades", crypto: "crypto", penny: "penny", pinkslips: "penny",
  pink_slips: "penny", pink_sheets: "penny", betting: "betting", sports: "betting", predictions: "predictions",
};
export const HOME_SPORTS = ["football", "basketball", "baseball", "hockey", "soccer", "mma", "tennis", "other"] as const;
export const HOME_CATEGORIES = ["geopolitics", "politics", "sports", "economy", "entertainment", "science", "crypto", "other"] as const;
export function opportunityKind(module: string): OpportunityKind | null { const key = module.trim().toLowerCase(); return Object.hasOwn(KINDS, key) ? KINDS[key] : null; }
export function opportunityTab(kind: OpportunityKind): TabId { return kind === "trades" ? "stocks" : kind; }
export function reportedScore(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value) : null;
}
export function opportunityView(opp: HomeOpportunity): "POSITIVE" | "NEGATIVE" | "MIXED" {
  const s = (opp.stance ?? "").toLowerCase();
  if (/sell|avoid|bear|negative|caution|defensive|wouldnt_buy|would_not_buy/.test(s)) return "NEGATIVE";
  if (/hold|neutral|mixed|watch/.test(s)) return "MIXED";
  if (/buy|bull|positive|supportive/.test(s)) return "POSITIVE";
  return opp.direction === "up" ? "POSITIVE" : opp.direction === "down" ? "NEGATIVE" : "MIXED";
}
/** Only match assets actually present in this briefing. Never invent theme positions. */
export function relatedOpportunities(theme: ProbabilityView, opportunities: HomeOpportunity[]): HomeOpportunity[] {
  const symbols = new Set((theme.relatedSymbols ?? []).map((s) => s.trim().toUpperCase()));
  return opportunities.filter((o) => symbols.has(o.symbol.trim().toUpperCase()));
}
export function buildOpportunitySave(opp: HomeOpportunity, owner: string, draft: SaveDraft) {
  const kind = opportunityKind(opp.module);
  const identity = opp.symbol.trim();
  if (!owner.trim()) throw new Error("Sign in before saving to your portfolio.");
  if (!kind) throw new Error("This item has no supported market identity. Open its source before saving.");
  if (!identity || identity.length > 1000) throw new Error("This item has no valid asset or event name.");
  if (kind === "betting") {
    if (!(HOME_SPORTS as readonly string[]).includes(draft.sport)) throw new Error("Choose the sport for this saved bet.");
    if (!draft.pick.trim() || draft.pick.trim().length > 300) throw new Error("Enter the exact selection you want to track.");
    if (draft.odds.length > 40 || draft.sportsbook.length > 100) throw new Error("Check the odds and sportsbook fields.");
    return { kind, path: "/advisor/betting/bets", body: { user_id: owner, matchup: identity,
      pick: draft.pick.trim(), sport: draft.sport, stake: 0,
      ...(draft.odds.trim() ? { odds: draft.odds.trim() } : {}),
      ...(draft.sportsbook.trim() ? { sportsbook: draft.sportsbook.trim() } : {}),
    } };
  }
  if (kind === "predictions") {
    if (!(HOME_CATEGORIES as readonly string[]).includes(draft.category)) throw new Error("Choose the prediction category.");
    if (draft.pick !== "Yes" && draft.pick !== "No") throw new Error("Choose the outcome you want to track.");
    const price = Number(draft.yesCents);
    if (!draft.yesCents.trim() || !Number.isFinite(price) || price < 0 || price > 100) throw new Error("Enter the market's actual YES price, from 0 to 100 cents. Do not use the Motive Signal.");
    return { kind, path: "/advisor/predictions/positions", body: { user_id: owner, market: identity,
      category: draft.category, pick: draft.pick, stake: 0, yes_price: price / 100 } };
  }
  const symbol = identity.toUpperCase().replace(/^\$/, "");
  if (!/^[A-Z0-9][A-Z0-9.\-/:]{0,24}$/.test(symbol)) throw new Error("A valid asset symbol is required. This description is not an asset symbol.");
  return { kind, path: "/terminal/portfolio/add", body: { user_id: owner, kind, symbol } };
}
export function saveWasAcknowledged(response: unknown, kind: OpportunityKind): boolean {
  if (!response || typeof response !== "object") return false;
  const r = response as Record<string, unknown>;
  return kind === "betting" || kind === "predictions"
    ? (typeof r.id === "string" && r.id.length > 0) || (typeof r.id === "number" && Number.isFinite(r.id))
    : r.saved === true;
}
