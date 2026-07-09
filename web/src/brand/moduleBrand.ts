import type { TabId } from "../types";

export type BrandModuleId = "home" | "trades" | "pinkslips" | "crypto" | "betting" | "predictions";

export interface ModuleBrand {
  id: BrandModuleId;
  name: string;
  accent: string;
  shadow: string;
  glow: string;
  tagline: string;
}

export const MODULE_BRAND: Record<BrandModuleId, ModuleBrand> = {
  home: {
    id: "home",
    name: "Home",
    accent: "#b24bf3",
    shadow: "#7b2ff7",
    glow: "rgba(123, 47, 247, 0.35)",
    tagline: "AI-Powered Markets. Real-Time Edge.",
  },
  trades: {
    id: "trades",
    name: "Trades",
    accent: "#00E676",
    shadow: "#00C853",
    glow: "rgba(0, 230, 118, 0.4)",
    tagline: "Watchlist & equity flow monitor",
  },
  pinkslips: {
    id: "pinkslips",
    name: "Pink Slips",
    accent: "#FF4081",
    shadow: "#F50057",
    glow: "rgba(255, 64, 129, 0.4)",
    tagline: "Microcap & garage inventory radar",
  },
  crypto: {
    id: "crypto",
    name: "Crypto",
    accent: "#00E5FF",
    shadow: "#7C4DFF",
    glow: "rgba(0, 229, 255, 0.4)",
    tagline: "On-chain whale & coin watchlist",
  },
  betting: {
    id: "betting",
    name: "Bets",
    accent: "#FFAB00",
    shadow: "#FF8F00",
    glow: "rgba(255, 171, 0, 0.4)",
    tagline: "Sharp money & sports odds monitor",
  },
  predictions: {
    id: "predictions",
    name: "Polymarket",
    accent: "#C084FC",
    shadow: "#A855F7",
    glow: "rgba(192, 132, 252, 0.4)",
    tagline: "Event markets · YES / NO tracker",
  },
};

export const TAB_TO_BRAND: Record<TabId, BrandModuleId> = {
  home: "home",
  stocks: "trades",
  penny: "pinkslips",
  crypto: "crypto",
  betting: "betting",
  predictions: "predictions",
};

export const APP_MODULE_TO_BRAND: Record<string, BrandModuleId> = {
  trades: "trades",
  penny: "pinkslips",
  crypto: "crypto",
  betting: "betting",
  predictions: "predictions",
};

export function brandForTab(tabId: TabId): ModuleBrand {
  return MODULE_BRAND[TAB_TO_BRAND[tabId]];
}

export function brandForModule(module: string): ModuleBrand {
  const id = APP_MODULE_TO_BRAND[module] ?? "trades";
  return MODULE_BRAND[id];
}
