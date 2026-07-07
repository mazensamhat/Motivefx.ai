export const PLATFORM_CATALOG: Record<string, Array<{ id: string; name: string; urlTemplate: string }>> = {
  trades: [
    { id: "robinhood", name: "Robinhood", urlTemplate: "https://robinhood.com/stocks/{symbol}" },
    { id: "webull", name: "Webull", urlTemplate: "https://www.webull.com/quote/us/{symbol}" },
    { id: "schwab", name: "Charles Schwab", urlTemplate: "https://www.schwab.com/" },
    { id: "fidelity", name: "Fidelity", urlTemplate: "https://digital.fidelity.com/prgw/digital/research/quote?symbol={symbol}" },
    { id: "etrade", name: "E*TRADE", urlTemplate: "https://us.etrade.com/market-monitor/research/stocks/{symbol}" },
    { id: "tdameritrade", name: "TD Ameritrade", urlTemplate: "https://www.schwab.com/" },
  ],
  penny: [
    { id: "robinhood", name: "Robinhood", urlTemplate: "https://robinhood.com/stocks/{symbol}" },
    { id: "webull", name: "Webull", urlTemplate: "https://www.webull.com/quote/us/{symbol}" },
    { id: "otcbb", name: "OTC Markets", urlTemplate: "https://www.otcmarkets.com/stock/{symbol}/overview" },
    { id: "tdameritrade", name: "TD Ameritrade", urlTemplate: "https://www.schwab.com/" },
  ],
  crypto: [
    { id: "coinbase", name: "Coinbase", urlTemplate: "https://www.coinbase.com/price/{symbol}" },
    { id: "binance", name: "Binance.US", urlTemplate: "https://www.binance.us/en/trade/{symbol}_USD" },
    { id: "kraken", name: "Kraken", urlTemplate: "https://pro.kraken.com/app/trade/{symbol}-usd" },
    { id: "crypto_com", name: "Crypto.com", urlTemplate: "https://crypto.com/price/{symbol}" },
    { id: "gemini", name: "Gemini", urlTemplate: "https://www.gemini.com/prices/{symbol}" },
  ],
  betting: [
    { id: "draftkings", name: "DraftKings", urlTemplate: "https://sportsbook.draftkings.com/" },
    { id: "fanduel", name: "FanDuel", urlTemplate: "https://sportsbook.fanduel.com/" },
    { id: "betmgm", name: "BetMGM", urlTemplate: "https://sports.betmgm.com/" },
    { id: "caesars", name: "Caesars Sportsbook", urlTemplate: "https://www.caesars.com/sportsbook-and-casino" },
    { id: "espn", name: "ESPN BET", urlTemplate: "https://espnbet.com/" },
  ],
  predictions: [
    { id: "polymarket", name: "Polymarket", urlTemplate: "https://polymarket.com/" },
    { id: "kalshi", name: "Kalshi", urlTemplate: "https://kalshi.com/" },
    { id: "predictit", name: "PredictIt", urlTemplate: "https://www.predictit.org/" },
    { id: "metaculus", name: "Metaculus", urlTemplate: "https://www.metaculus.com/" },
  ],
};

export const MODULE_LABELS: Record<string, string> = {
  trades: "Trades & Stocks",
  penny: "Pink Slips (Penny Stocks)",
  crypto: "Crypto",
  betting: "Sports Betting",
  predictions: "Prediction Markets",
};

export function catalogForApi() {
  return { modules: MODULE_LABELS, platforms: PLATFORM_CATALOG };
}

export function findPlatform(module: string, platformId: string) {
  return PLATFORM_CATALOG[module]?.find((p) => p.id === platformId) ?? null;
}

export function buildDeeplink(
  module: string,
  platformId: string,
  opts: { symbol?: string; query?: string; side?: string; customUrl?: string | null } = {}
): string | null {
  if (platformId === "custom" && opts.customUrl) return opts.customUrl.trim();
  const platform = findPlatform(module, platformId);
  if (!platform) return null;

  let sym = (opts.symbol ?? "").toUpperCase().replace("$", "").trim();
  const q = (opts.query ?? "").trim();
  let url = platform.urlTemplate;

  if (url.includes("{symbol}")) {
    if (!sym && ["trades", "penny", "crypto"].includes(module)) {
      sym = module === "crypto" ? "BTC" : "SPY";
    }
    url = url.replace("{symbol}", sym || "SPY");
  }
  if (url.includes("{query}")) {
    url = url.replace("{query}", encodeURIComponent(q || sym));
  }
  const side = (opts.side ?? "BUY").toUpperCase();
  url += side === "SELL" || side === "NO" ? "#motivfx-action=sell" : "#motivfx-action=buy";
  return url;
}
