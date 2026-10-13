export function isVolumeProxy(row:{sourceType?:unknown;note?:unknown}):boolean {
  return row.sourceType === "DERIVED" || /proxy|not a single whale|24h vol/i.test(String(row.note ?? ""));
}
