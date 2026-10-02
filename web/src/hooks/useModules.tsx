import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { WinHookModal } from "../components/WinHookModal";
import { useAuth } from "./useAuth";
import { resolveAcquisitionChannel } from "../lib/acquisition";
import { apiGet, apiPost, getAccessToken, getUserId } from "../lib/api";
import { isNativeIapAvailable, isNativeIosShell, isNativeShell, requestNativeIapPurchase, syncNativeShellDocumentClass } from "../lib/nativeShell";
import { SITE_EMBED } from "../lib/siteSession";
import { applySitePlanToModulesPayload, fetchSitePlan } from "../lib/sitePlan";
import { DEFAULT_PLAN, EntitlementFeature, UserPlanSnapshot, hasFeatureFromMap, iosFreeReaderPlan } from "../lib/entitlements";
import type { PricingTierId } from "../config/pricingTiers";

interface ModuleCatalog { [key: string]: { name: string; price: number; tagline: string }; }
export interface WinStory {
  module: string; city: string; amount: number; amountFormatted: string;
  signal?: string; detail: string; timeAgo: string; headline: string;
}
interface SimulationStatus { active: boolean; expiresAt: string | null; bankroll: number; modules: string[]; daysRemaining: number; }
type ModulePayload = {
  active?: string[]; catalog?: ModuleCatalog; hasAnnual?: boolean; annualPrice?: number;
  simulation?: SimulationStatus | null; tier?: PricingTierId; selectedMarkets?: string[];
  allowedMarkets?: string[]; features?: Record<string, boolean>; entitlements?: string[];
};
interface ModulesState {
  active: string[]; catalog: ModuleCatalog; loading: boolean; error: string | null;
  hasAnnual: boolean; annualPrice: number; simulation: SimulationStatus | null;
  tier: PricingTierId; plan: UserPlanSnapshot; allowedMarkets: string[];
  hasModule: (module: string) => boolean;
  hasFeature: (feature: EntitlementFeature) => boolean;
  isSimulationOnly: (module: string) => boolean;
  refresh: () => Promise<void>; triggerWinHook: (module: string) => void;
  subscribeModule: (module: string, successPath?: string) => Promise<void>;
  subscribeAnnual: () => Promise<void>;
  subscribeTier: (tier: PricingTierId, selectedMarkets?: string[]) => Promise<void>;
}
const ModulesContext = createContext<ModulesState | null>(null);
export function ModulesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading, openAuth, user } = useAuth();
  const [active, setActive] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<ModuleCatalog>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAnnual, setHasAnnual] = useState(false);
  const [annualPrice, setAnnualPrice] = useState(799);
  const [plan, setPlan] = useState<UserPlanSnapshot>(DEFAULT_PLAN);
  const [simulation, setSimulation] = useState<SimulationStatus | null>(null);
  const [winOpen, setWinOpen] = useState(false);
  const [winStory, setWinStory] = useState<WinStory | null>(null);
  const [winModule, setWinModule] = useState("");
  const loadSequence = useRef(0);
  const refreshFlight = useRef<Promise<void> | null>(null);
  const appliedIdentity = useRef<string | null>(null);

  const applyModulesPayload = useCallback((data: ModulePayload) => {
    if (isNativeIosShell()) {
      const reader = iosFreeReaderPlan();
      setActive(reader.allowedMarkets); setCatalog(data.catalog ?? {});
      setHasAnnual(false); setSimulation(null); setPlan(reader);
      if (data.annualPrice) setAnnualPrice(data.annualPrice);
      return;
    }
    setActive(data.active ?? []); setCatalog(data.catalog ?? {});
    setHasAnnual(data.hasAnnual ?? false); setSimulation(data.simulation ?? null);
    if (data.annualPrice) setAnnualPrice(data.annualPrice);
    setPlan({ tier: data.tier ?? DEFAULT_PLAN.tier, selectedMarkets: data.selectedMarkets ?? [],
      allowedMarkets: data.allowedMarkets ?? data.active ?? [], features: data.features ?? {},
      entitlements: data.entitlements ?? [], hasAnnual: data.hasAnnual ?? false });
    // Applying a snapshot is not an external entitlement-change event. Dispatching
    // here fed the refresh listener back into itself during application boot.
  }, []);

  const refresh = useCallback(async () => {
    if (refreshFlight.current) return refreshFlight.current;
    const seq = ++loadSequence.current;
    const identity = user?.userId ?? null;
    const task = async () => {
      setLoading(true); setError(null);
      if (appliedIdentity.current !== identity) {
        setActive([]); setSimulation(null); setPlan(DEFAULT_PLAN); setHasAnnual(false);
        appliedIdentity.current = identity;
      }
      try {
        if (isNativeIosShell()) { applyModulesPayload({}); return; }
        if (!isAuthenticated) { applyModulesPayload({}); return; }
        const sitePlan = SITE_EMBED ? await fetchSitePlan() : null;
        if (seq !== loadSequence.current) return;
        if (sitePlan?.hasSubscription) {
          // This is the authenticated server snapshot, not browser-stored access.
          // Avoid a second session/DB/trial request before restoring paid markets.
          applyModulesPayload(sitePlan.modules ?? applySitePlanToModulesPayload({ active: [], catalog: {}, allowedMarkets: [], hasAnnual: false }, sitePlan));
          return;
        }
        const data = await apiGet<ModulePayload>(`/advisor/modules/${getUserId()}`);
        if (seq === loadSequence.current) applyModulesPayload(applySitePlanToModulesPayload(data, sitePlan));
      } catch {
        if (seq === loadSequence.current) setError("We could not verify your access. Your plan has not been changed. Retry the check.");
      } finally {
        if (seq === loadSequence.current) setLoading(false);
      }
    };
    const flight = task().finally(() => { if (refreshFlight.current === flight) refreshFlight.current = null; });
    refreshFlight.current = flight;
    return flight;
  }, [isAuthenticated, user?.userId, applyModulesPayload]);

  const triggerWinHook = useCallback(async (module: string) => {
    if (hasAnnual) return;
    try {
      const story = await apiGet<WinStory>(`/advisor/win-hook/${module}`);
      setWinStory(story); setWinModule(module); setWinOpen(true);
    } catch { /* Optional promotional content never blocks access. */ }
  }, [hasAnnual]);

  const subscribeModule = useCallback(async (module: string) => {
    if (isNativeShell()) {
      if (isNativeIapAvailable()) requestNativeIapPurchase("lite", getUserId());
      return;
    }
    if (!getAccessToken() && !isAuthenticated) { openAuth("register"); return; }
    const res = await apiPost<{ checkoutUrl?: string; demoMode?: boolean }>("/advisor/billing/module-checkout", {
      module, user_id: getUserId(), acquisition_channel: resolveAcquisitionChannel(),
      success_url: `${window.location.origin}/?sub=${module}`, cancel_url: window.location.href,
    });
    if (res.checkoutUrl) window.location.href = res.checkoutUrl;
    else { await refresh(); window.dispatchEvent(new Event("motivefx:platform-setup")); await triggerWinHook(module === "bundle" ? "trades" : module); }
  }, [refresh, triggerWinHook, openAuth, isAuthenticated]);

  const subscribeTier = useCallback(async (tier: PricingTierId, selectedMarkets: string[] = []) => {
    if (isNativeShell()) {
      if (isNativeIapAvailable()) requestNativeIapPurchase(tier, getUserId());
      return;
    }
    if (!getAccessToken() && !isAuthenticated) { openAuth("register"); return; }
    const res = await apiPost<{ checkoutUrl?: string; demoMode?: boolean; tier?: PricingTierId; message?: string }>("/advisor/billing/tier-checkout", {
      tier, selected_markets: selectedMarkets, user_id: getUserId(), acquisition_channel: resolveAcquisitionChannel(),
      success_url: `${window.location.origin}/?tier=${tier}`, cancel_url: `${window.location.origin}/#pricing`,
    });
    if (res.checkoutUrl) window.location.href = res.checkoutUrl;
    else { await refresh(); window.dispatchEvent(new Event("motivefx:platform-setup")); window.dispatchEvent(new Event("motivefx:entitlements-changed")); }
  }, [refresh, openAuth, isAuthenticated]);

  const subscribeAnnual = useCallback(async () => {
    if (isNativeShell()) {
      if (isNativeIapAvailable()) requestNativeIapPurchase("elite", getUserId());
      return;
    }
    if (!getAccessToken() && !isAuthenticated) { openAuth("register"); return; }
    const res = await apiPost<{ checkoutUrl?: string; demoMode?: boolean }>("/advisor/billing/annual-checkout", {
      user_id: getUserId(), acquisition_channel: resolveAcquisitionChannel(),
      success_url: `${window.location.origin}/?annual=1`, cancel_url: window.location.href,
    });
    if (res.checkoutUrl) window.location.href = res.checkoutUrl;
    else { await refresh(); setWinOpen(false); window.dispatchEvent(new Event("motivefx:platform-setup")); }
  }, [refresh, openAuth, isAuthenticated]);

  useEffect(() => {
    const onChange = () => { void refresh(); };
    window.addEventListener("motivefx:auth-changed", onChange);
    window.addEventListener("motivefx:entitlements-changed", onChange);
    return () => {
      window.removeEventListener("motivefx:auth-changed", onChange);
      window.removeEventListener("motivefx:entitlements-changed", onChange);
    };
  }, [refresh]);
  useEffect(() => {
    if (authLoading) return;
    syncNativeShellDocumentClass();
    void refresh();
    return () => { loadSequence.current += 1; refreshFlight.current = null; };
  }, [authLoading, refresh]);

  const allowedMarkets = plan.allowedMarkets;
  const hasModule = useCallback((module: string) => {
    if (error) return false;
    if (isNativeIosShell()) return true;
    if (typeof window !== "undefined") {
      const demo = new URLSearchParams(window.location.search).get("demo") === "1" || document.cookie.split(";").some((c) => c.trim().startsWith("motivefx_demo=1"));
      if (demo) return true;
    }
    if (active.includes(module) && allowedMarkets.includes(module)) return true;
    return Boolean(simulation?.active && simulation.modules.includes(module));
  }, [active, allowedMarkets, simulation, error]);
  const hasFeature = useCallback((feature: EntitlementFeature) => {
    if (error) return false;
    if (isNativeIosShell()) return hasFeatureFromMap(iosFreeReaderPlan().features, feature);
    return hasFeatureFromMap(plan.features, feature);
  }, [plan.features, error]);
  const isSimulationOnly = useCallback((module: string) => {
    if (isNativeIosShell()) return false;
    if (active.includes(module) && allowedMarkets.includes(module)) return false;
    return Boolean(simulation?.active && simulation.modules.includes(module));
  }, [active, allowedMarkets, simulation]);
  return <ModulesContext.Provider value={{ active, catalog, loading, error, hasAnnual, annualPrice, simulation,
    tier: plan.tier, plan, allowedMarkets, hasModule, hasFeature, isSimulationOnly,
    refresh, triggerWinHook, subscribeModule, subscribeAnnual, subscribeTier }}>
    {children}
    {winOpen && winStory && !hasAnnual && !isNativeIosShell() && <WinHookModal story={winStory} subscribedModule={winModule} annualPrice={annualPrice} onUpgrade={subscribeAnnual} onDismiss={() => setWinOpen(false)} />}
  </ModulesContext.Provider>;
}
export function useModules() {
  const ctx = useContext(ModulesContext);
  if (!ctx) throw new Error("useModules must be used within ModulesProvider");
  return ctx;
}
