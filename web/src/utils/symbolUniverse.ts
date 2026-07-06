/** Client-side hints — backend enforces live price rules in symbol_universe.py */

const PENNY_SYMBOLS = new Set([
  "SNDL", "AMC", "CLOV", "BNGO", "SENS", "OPEN", "BBAI",
  "PLUG", "FCEL", "TLRY", "NOK", "LCID", "RIOT", "MARA",
  "HUT", "CLSK", "CORZ", "WULF", "GRAB", "SOFI", "NIO",
  "ACHR", "JOBY", "RXRX", "GME",
]);

const TRADES_SYMBOLS = new Set([
  "SPY", "QQQ", "AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "META",
  "GOOGL", "AMD", "COIN", "PLTR",
]);

export function validateSymbolForModule(
  symbol: string,
  module: "trades" | "penny" | "crypto"
): string | null {
  if (module === "crypto") return null;

  const sym = symbol.toUpperCase().trim().replace(/^\$/, "");
  if (!sym) return "Enter a symbol.";

  if (module === "trades" && PENNY_SYMBOLS.has(sym)) {
    return `$${sym} is a Pink Slip name — add it under Pink Slips, not Trades.`;
  }
  if (module === "penny" && TRADES_SYMBOLS.has(sym)) {
    return `$${sym} is a Trades / block-flow name — add it under Trades, not Pink Slips.`;
  }
  return null;
}
