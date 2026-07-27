import type { BrandModuleId } from "../brand/moduleBrand";

/** App module keys stored in platform preferences (distinct from brand ids) */
export type PlatformModuleKey = "trades" | "penny" | "crypto" | "betting" | "predictions";

export interface PlatformOption {
  id: string;
  name: string;
  urlTemplate: string;
}

export interface PlatformPref {
  platformId: string;
  customUrl?: string | null;
}

export interface PlatformCatalogResponse {
  modules: Record<PlatformModuleKey, string>;
  platforms: Record<PlatformModuleKey, PlatformOption[]>;
  prefs: Record<string, PlatformPref>;
}

export const PLATFORM_MODULE_KEYS: PlatformModuleKey[] = [
  "trades",
  "penny",
  "crypto",
  "betting",
  "predictions",
];

export const APP_MODULE_TO_PLATFORM: Record<string, PlatformModuleKey> = {
  trades: "trades",
  penny: "penny",
  crypto: "crypto",
  betting: "betting",
  predictions: "predictions",
};

/** Local catalog so setup never blocks on a slow/failed prefs API. */
export function defaultPlatformCatalog(
  prefs: Record<string, PlatformPref> = {}
): PlatformCatalogResponse {
  return {
    modules: {
      trades: "Trades & Stocks",
      penny: "Pink Slips (Penny Stocks)",
      crypto: "Crypto",
      betting: "Sports Betting",
      predictions: "Prediction Markets",
    },
    platforms: {
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
    },
    prefs,
  };
}

export function brandToPlatformModule(brand: BrandModuleId): PlatformModuleKey {
  if (brand === "home") return "trades";
  const map: Record<Exclude<BrandModuleId, "home">, PlatformModuleKey> = {
    trades: "trades",
    pinkslips: "penny",
    crypto: "crypto",
    betting: "betting",
    predictions: "predictions",
  };
  return map[brand];
}

export function platformName(
  catalog: PlatformCatalogResponse | null,
  module: PlatformModuleKey,
  pref?: PlatformPref | null
): string | null {
  if (!pref?.platformId) return null;
  if (pref.platformId === "custom") return "your app";
  const match = catalog?.platforms[module]?.find((p) => p.id === pref.platformId);
  return match?.name ?? pref.platformId;
}
