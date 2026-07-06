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
