import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { BrandModuleId } from "../brand/moduleBrand";
import { AssetDeepDiveModal } from "../components/AssetDeepDiveModal";
import { buildAssetDeepDive, type AssetDeepDivePayload } from "../utils/assetDeepDive";

interface AssetDeepDiveContextValue {
  openDeepDive: (row: Record<string, unknown>, module: BrandModuleId) => void;
  openSymbolDeepDive: (
    symbol: string,
    module: BrandModuleId,
    extras?: Record<string, unknown>
  ) => void;
  closeDeepDive: () => void;
}

const AssetDeepDiveContext = createContext<AssetDeepDiveContextValue | null>(null);

export function AssetDeepDiveProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<AssetDeepDivePayload | null>(null);
  const [module, setModule] = useState<BrandModuleId>("trades");

  const openDeepDive = useCallback((row: Record<string, unknown>, mod: BrandModuleId) => {
    setModule(mod === "home" ? "trades" : mod);
    setPayload(buildAssetDeepDive(row, mod === "home" ? "trades" : mod));
  }, []);

  const openSymbolDeepDive = useCallback(
    (symbol: string, mod: BrandModuleId, extras?: Record<string, unknown>) => {
      openDeepDive(
        {
          symbol,
          timestamp: new Date().toISOString(),
          ...extras,
        },
        mod
      );
    },
    [openDeepDive]
  );

  const closeDeepDive = useCallback(() => {
    setPayload(null);
  }, []);

  return (
    <AssetDeepDiveContext.Provider value={{ openDeepDive, openSymbolDeepDive, closeDeepDive }}>
      {children}
      <AssetDeepDiveModal payload={payload} module={module} onClose={closeDeepDive} />
    </AssetDeepDiveContext.Provider>
  );
}

export function useAssetDeepDive() {
  const ctx = useContext(AssetDeepDiveContext);
  if (!ctx) throw new Error("useAssetDeepDive must be used within AssetDeepDiveProvider");
  return ctx;
}

/** Safe optional hook — returns null outside provider (for shared leaf components). */
export function useAssetDeepDiveOptional() {
  return useContext(AssetDeepDiveContext);
}
