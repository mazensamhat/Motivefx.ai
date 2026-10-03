export type ParsedWatchAgent = {
  name: string;
  symbol: string;
  metric: "signal" | "confidence" | "signal_change";
  operator: "above" | "below";
  threshold: number;
};

export function parseWatchAgentDraft(input: string): ParsedWatchAgent | null {
  const text = input.trim();
  if (!text) return null;
  const symbol = text.match(/(?:watch|monitor|track)\s+\$?([A-Z0-9][A-Z0-9.\-]{0,20})/i)?.[1]?.toUpperCase();
  if (!symbol) return null;
  const metric = /confidence/i.test(text)
    ? "confidence"
    : /(?:signal\s+)?change|moves?\s+(?:by|more)|changes?\s+(?:by|more)/i.test(text)
      ? "signal_change"
      : "signal";
  const operator = /(?:below|under|falls?\s+below|drops?\s+below|less\s+than)/i.test(text)
    ? "below"
    : /(?:above|over|rises?\s+above|exceeds?|greater\s+than|more\s+than)/i.test(text)
      ? "above"
      : null;
  const numbers = [...text.matchAll(/\b(\d{1,3}(?:\.\d+)?)\b/g)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 100);
  const threshold = numbers.at(-1);
  if (!operator || threshold == null) return null;
  return { name: text.slice(0, 120), symbol, metric, operator, threshold };
}
