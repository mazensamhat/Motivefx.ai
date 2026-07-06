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
    tagline: "The AI Command Center for Market Intelligence",
  },
  trades: {
    id: "trades",
    name: "Trades",
    accent: "#00E676",
    shadow: "#00C853",
    glow: "rgba(0, 230, 118, 0.4)",
    tagline: "Global stocks & options activity alerts",
  },
  pinkslips: {
    id: "pinkslips",
    name: "Pink Slips",
    accent: "#FF4081",
    shadow: "#F50057",
    glow: "rgba(255, 64, 129, 0.4)",
    tagline: "Penny stock microcap scanner insights",
  },
  crypto: {
    id: "crypto",
    name: "Crypto",
    accent: "#00E5FF",
    shadow: "#7C4DFF",
    glow: "rgba(0, 229, 255, 0.4)",
    tagline: "On-chain whale wallet tracker",
  },
  betting: {
    id: "betting",
    name: "Betting",
    accent: "#FFAB00",
    shadow: "#FF8F00",
    glow: "rgba(255, 171, 0, 0.4)",
    tagline: "Sharp money & sports odds monitor",
  },
  predictions: {
    id: "predictions",
    name: "Predictions",
    accent: "#FF1744",
    shadow: "#D500F9",
    glow: "rgba(255, 23, 68, 0.4)",
    tagline: "Binary event outcome tracker",
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
