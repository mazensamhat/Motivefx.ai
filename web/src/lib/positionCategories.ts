/** Canonical display/filter groups. Provider league/category keys remain untouched in storage. */
const keyOf = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
export const SPORT_GROUPS = [
  ["football", "Football"], ["basketball", "Basketball"], ["baseball", "Baseball"],
  ["hockey", "Hockey"], ["soccer", "Soccer"], ["mma", "MMA"], ["tennis", "Tennis"], ["other", "Other / unclassified"],
] as const;
export function sportGroup(value: unknown): string {
  const key = keyOf(value);
  if (/^(ice_?hockey|hockey|nhl)(_|$)/.test(key)) return "hockey";
  if (/^(american_?football|football|nfl|ncaaf|cfl)(_|$)/.test(key)) return "football";
  if (/^(basketball|nba|wnba|ncaab)(_|$)/.test(key)) return "basketball";
  if (/^(baseball|mlb)(_|$)/.test(key)) return "baseball";
  if (/^(soccer|mls|epl)(_|$)/.test(key)) return "soccer";
  if (/^(mma|ufc|mixed_martial_arts)(_|$)/.test(key)) return "mma";
  if (/^(tennis|atp|wta)(_|$)/.test(key)) return "tennis";
  return "other";
}
export function sportLabel(value: unknown) { return SPORT_GROUPS.find(([key]) => key === sportGroup(value))![1]; }
export const PREDICTION_GROUPS = [
  ["geopolitics", "Geopolitics & War"], ["politics", "Politics & Elections"],
  ["sports", "Sports"], ["economy", "Economy & Fed"], ["entertainment", "Celebrity & Culture"],
  ["science", "Science & Technology"], ["crypto", "Crypto Events"], ["other", "Other / unclassified"],
] as const;
export function predictionGroup(value: unknown): string {
  const key = keyOf(value);
  if (/^(sports?|betting)(_|$)/.test(key)) return "sports";
  if (/^(geopolitics|war)(_|$)/.test(key)) return "geopolitics";
  if (/^(politics|political|elections?)(_|$)/.test(key)) return "politics";
  if (/^(economy|economics|finance|fed)(_|$)/.test(key)) return "economy";
  if (/^(entertainment|celebrity|culture)(_|$)/.test(key)) return "entertainment";
  if (/^(science|tech|technology)(_|$)/.test(key)) return "science";
  if (/^(crypto|cryptocurrency)(_|$)/.test(key)) return "crypto";
  return "other";
}
export function predictionLabel(value: unknown) { return PREDICTION_GROUPS.find(([key]) => key === predictionGroup(value))![1]; }
