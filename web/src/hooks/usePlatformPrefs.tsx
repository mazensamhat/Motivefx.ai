import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BrandModuleId } from "../brand/moduleBrand";
import {
  APP_MODULE_TO_PLATFORM,
  brandToPlatformModule,
  platformName,
  type PlatformCatalogResponse,
  type PlatformModuleKey,
  type PlatformPref,
} from "../config/tradingPlatforms";
import { apiGet, apiPost } from "../lib/api";
import { PlatformSetupModal } from "../components/PlatformSetupModal";
import { useAuth } from "./useAuth";

interface PlatformPrefsState {
  catalog: PlatformCatalogResponse | null;
  prefs: Record<string, PlatformPref>;
  loaded: boolean;
  setupOpen: boolean;
  openSetup: () => void;
  closeSetup: () => void;
  savePrefs: (next: Record<string, PlatformPref>) => Promise<void>;
  isCompleteFor: (activeModules: string[]) => boolean;
  getPref: (brand: BrandModuleId) => PlatformPref | undefined;
  getPlatformLabel: (brand: BrandModuleId) => string | null;
  openDeeplink: (
    brand: BrandModuleId,
    side: "BUY" | "SELL",
    symbol?: string,
    query?: string
  ) => Promise<{ url: string; platformName: string }>;
}

const PlatformPrefsContext = createContext<PlatformPrefsState | null>(null);

export function PlatformPrefsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [catalog, setCatalog] = useState<PlatformCatalogResponse | null>(null);
  const [prefs, setPrefs] = useState<Record<string, PlatformPref>>({});
  const [loaded, setLoaded] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.userId) {
      setCatalog(null);
      setPrefs({});
      setLoaded(true);
      return;
    }
    try {
      const data = await apiGet<PlatformCatalogResponse>(
        `/advisor/platform-prefs/${encodeURIComponent(user.userId)}`
      );
      setCatalog(data);
      setPrefs(data.prefs ?? {});
    } catch {
      setCatalog(null);
      setPrefs({});
    } finally {
      setLoaded(true);
    }
  }, [isAuthenticated, user?.userId]);

  useEffect(() => {
    setLoaded(false);
    refresh();
    const onAuth = () => refresh();
    window.addEventListener("motivefx:auth-changed", onAuth);
    return () => window.removeEventListener("motivefx:auth-changed", onAuth);
  }, [refresh]);

  useEffect(() => {
    const open = () => {
      setSetupOpen(true);
      void refresh();
    };
    window.addEventListener("motivefx:platform-setup", open);
    return () => window.removeEventListener("motivefx:platform-setup", open);
  }, [refresh]);

  const savePrefs = useCallback(
    async (next: Record<string, PlatformPref>) => {
      if (!user?.userId) throw new Error("Sign in to save app preferences.");
      const res = await apiPost<{ prefs: Record<string, PlatformPref> }>(
        "/advisor/platform-prefs",
        { user_id: user.userId, prefs: next }
      );
      setPrefs(res.prefs ?? next);
      setSetupOpen(false);
    },
    [user?.userId]
  );

  const isCompleteFor = useCallback(
    (activeModules: string[]) => {
      const keys = activeModules
        .filter((m) => m !== "annual")
        .map((m) => APP_MODULE_TO_PLATFORM[m])
        .filter(Boolean) as PlatformModuleKey[];
      if (keys.length === 0) return true;
      return keys.every((k) => Boolean(prefs[k]?.platformId));
    },
    [prefs]
  );

  const getPref = useCallback(
    (brand: BrandModuleId) => prefs[brandToPlatformModule(brand)],
    [prefs]
  );

  const getPlatformLabel = useCallback(
    (brand: BrandModuleId) => {
      const key = brandToPlatformModule(brand);
      return platformName(catalog, key, prefs[key]);
    },
    [catalog, prefs]
  );

  const openDeeplink = useCallback(
    async (
      brand: BrandModuleId,
      side: "BUY" | "SELL",
      symbol = "",
      query = ""
    ) => {
      if (!user?.userId) throw new Error("Sign in to open your broker app.");
      const module = brandToPlatformModule(brand);
      const res = await apiPost<{ url: string; platformName: string }>(
        "/advisor/platform-deeplink",
        {
          user_id: user.userId,
          module,
          side,
          symbol,
          query,
        }
      );
      window.open(res.url, "_blank", "noopener,noreferrer");
      return res;
    },
    [user?.userId]
  );

  const openSetup = useCallback(() => {
    setSetupOpen(true);
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      catalog,
      prefs,
      loaded,
      setupOpen,
      openSetup,
      closeSetup: () => setSetupOpen(false),
      savePrefs,
      isCompleteFor,
      getPref,
      getPlatformLabel,
      openDeeplink,
    }),
    [
      catalog,
      prefs,
      loaded,
      setupOpen,
      openSetup,
      savePrefs,
      isCompleteFor,
      getPref,
      getPlatformLabel,
      openDeeplink,
    ]
  );

  return (
    <PlatformPrefsContext.Provider value={value}>
      {children}
      {setupOpen &&
        (catalog ? (
          <PlatformSetupModal
            catalog={catalog}
            prefs={prefs}
            onSave={savePrefs}
            onClose={() => setSetupOpen(false)}
          />
        ) : (
          <div className="platform-setup-overlay" onClick={() => setSetupOpen(false)} role="presentation">
            <div
              className="platform-setup-modal glass-panel platform-setup-loading"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal
              aria-busy
            >
              <p className="platform-setup-loading-text">Loading apps &amp; brokers…</p>
            </div>
          </div>
        ))}
    </PlatformPrefsContext.Provider>
  );
}

export function usePlatformPrefs() {
  const ctx = useContext(PlatformPrefsContext);
  if (!ctx) throw new Error("usePlatformPrefs must be used within PlatformPrefsProvider");
  return ctx;
}

/** Auto-prompt setup when subscriber has modules but no platform prefs */
export function PlatformSetupGate({ activeModules }: { activeModules: string[] }) {
  const { isAuthenticated } = useAuth();
  const { loaded, isCompleteFor, openSetup } = usePlatformPrefs();

  useEffect(() => {
    if (!isAuthenticated || !loaded || activeModules.length === 0) return;
    if (isCompleteFor(activeModules)) return;
    if (sessionStorage.getItem("motivefx_platform_setup_dismissed")) return;
    const t = window.setTimeout(() => openSetup(), 800);
    return () => window.clearTimeout(t);
  }, [isAuthenticated, loaded, activeModules, isCompleteFor, openSetup]);

  return null;
}
