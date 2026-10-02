/** Display/filter taxonomy. The original provider values remain stored unchanged. */
export const SPORTS = [
  { value: "football", label: "Football" }, { value: "basketball", label: "Basketball" },
  { value: "baseball", label: "Baseball" }, { value: "hockey", label: "Hockey" },
  { value: "soccer", label: "Soccer" }, { value: "mma", label: "MMA" },
  { value: "tennis", label: "Tennis" }, { value: "other", label: "Other / unspecified" },
];
export const PREDICTION_CATEGORIES = [
  { value: "sports", label: "Sports" }, { value: "geopolitics", label: "Geopolitics & War" },
  { value: "politics", label: "Politics & Elections" }, { value: "entertainment", label: "Celebrity & Culture" },
  { value: "economy", label: "Economy & Fed" }, { value: "science", label: "Science & Tech" },
  { value: "crypto", label: "Crypto Events" }, { value: "other", label: "Other / unspecified" },
];
const key = (value: unknown) => typeof value === "string" ? value.trim().toLowerCase().replace(/[\s-]+/g, "_") : "";
export function sportCategory(value: unknown): string {
  const v = key(value);
  if (/^(nhl|ahl|khl|hockey|icehockey)(_|$)/.test(v) || v === "ice_hockey") return "hockey";
  if (/^(nfl|ncaaf|cfl|americanfootball|football)(_|$)/.test(v) || v === "american_football") return "football";
  if (/^(nba|wnba|ncaab|basketball)(_|$)/.test(v)) return "basketball";
  if (/^(mlb|baseball)(_|$)/.test(v)) return "baseball";
  if (/^(soccer|mls|epl|uefa)(_|$)/.test(v)) return "soccer";
  if (/^(mma|ufc)(_|$)/.test(v)) return "mma";
  if (/^(tennis|atp|wta)(_|$)/.test(v)) return "tennis";
  return "other";
}
export function predictionCategory(value: unknown): string {
  const v = key(value);
  if (/sport/.test(v)) return "sports";
  if (/geopolit|war/.test(v)) return "geopolitics";
  if (/politic|election/.test(v)) return "politics";
  if (/entertain|celeb|culture/.test(v)) return "entertainment";
  if (/econom|finance|fed/.test(v)) return "economy";
  if (/science|tech/.test(v)) return "science";
  if (/crypto|bitcoin/.test(v)) return "crypto";
  return "other";
}
export function positionCategoryLabel(kind: "betting" | "predictions", raw: unknown): string {
  const choices = kind === "betting" ? SPORTS : PREDICTION_CATEGORIES;
  const normalized = kind === "betting" ? sportCategory(raw) : predictionCategory(raw);
  return choices.find((c) => c.value === normalized)?.label ?? "Other / unspecified";
}
