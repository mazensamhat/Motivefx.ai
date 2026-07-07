import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { WinHookModal } from "../components/WinHookModal";
import { useAuth } from "./useAuth";
import { resolveAcquisitionChannel } from "../lib/acquisition";
import { apiGet, apiPost, getAccessToken, getUserId } from "../lib/api";
import { syncSiteEntitlementsFromServer, SITE_EMBED } from "../lib/siteSession";
import {
  applySitePlanToModulesPayload,
  fetchSitePlan,
} from "../lib/sitePlan";
import {
  DEFAULT_PLAN,
  EntitlementFeature,
  UserPlanSnapshot,
  hasFeatureFromMap,
} from "../lib/entitlements";
import type { PricingTierId } from "../config/pricingTiers";

interface ModuleCatalog {
  [key: string]: { name: string; price: number; tagline: string };
}

export interface WinStory {
  module: string;
  city: string;
  amount: number;
  amountFormatted: string;
  signal?: string;
  detail: string;
  timeAgo: string;
  headline: string;
}

interface SimulationStatus {
  active: boolean;
  expiresAt: string | null;
  bankroll: number;
  modules: string[];
  daysRemaining: number;
}

interface ModulesState {
  active: string[];
  catalog: ModuleCatalog;
  loading: boolean;
  hasAnnual: boolean;
  annualPrice: number;
  simulation: SimulationStatus | null;
  tier: PricingTierId;
  plan: UserPlanSnapshot;
  allowedMarkets: string[];
  hasModule: (module: string) => boolean;
  hasFeature: (feature: EntitlementFeature) => boolean;
  isSimulationOnly: (module: string) => boolean;
  refresh: () => Promise<void>;
  triggerWinHook: (module: string) => void;
  subscribeModule: (module: string, successPath?: string) => Promise<void>;
  subscribeAnnual: () => Promise<void>;
  subscribeTier: (tier: PricingTierId, selectedMarkets?: string[]) => Promise<void>;
}

const ModulesContext = createContext<ModulesState | null>(null);

export function ModulesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading, openAuth } = useAuth();
  const [active, setActive] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<ModuleCatalog>({});
  const [loading, setLoading] = useState(true);
  const [hasAnnual, setHasAnnual] = useState(false);
  const [annualPrice, setAnnualPrice] = useState(799);
  const [plan, setPlan] = useState<UserPlanSnapshot>(DEFAULT_PLAN);
  const [simulation, setSimulation] = useState<SimulationStatus | null>(null);
  const [winOpen, setWinOpen] = useState(false);
  const [winStory, setWinStory] = useState<WinStory | null>(null);
  const [winModule, setWinModule] = useState("");
  const prevTierRef = useRef<PricingTierId | null>(null);

  const applyModulesPayload = useCallback(
    (data: {
      active?: string[];
      catalog?: ModuleCatalog;
      hasAnnual?: boolean;
      annualPrice?: number;
      simulation?: SimulationStatus;
      tier?: PricingTierId;
      selectedMarkets?: string[];
      allowedMarkets?: string[];
      features?: Record<string, boolean>;
      entitlements?: string[];
    }) => {
      setActive(data.active ?? []);
      setCatalog(data.catalog ?? {});
      const annual = data.hasAnnual ?? false;
      setHasAnnual(annual);
      setSimulation(data.simulation ?? null);
      if (data.annualPrice) setAnnualPrice(data.annualPrice);
      setPlan({
        tier: data.tier ?? DEFAULT_PLAN.tier,
        selectedMarkets: data.selectedMarkets ?? [],
        allowedMarkets: data.allowedMarkets ?? data.active ?? [],
        features: data.features ?? {},
        entitlements: data.entitlements ?? [],
        hasAnnual: data.hasAnnual ?? false,
      });
      const nextTier = data.tier ?? DEFAULT_PLAN.tier;
      if (prevTierRef.current && prevTierRef.current !== nextTier) {
        window.dispatchEvent(new Event("motivefx:entitlements-changed"));
      }
      prevTierRef.current = nextTier;
    },
    []
  );

  const applySitePlanOnly = useCallback(
    (sitePlan: Awaited<ReturnType<typeof fetchSitePlan>>) => {
      if (!sitePlan?.hasSubscription) return false;
      applyModulesPayload(
        applySitePlanToModulesPayload(
          { active: [], catalog: {}, allowedMarkets: [], hasAnnual: false },
          sitePlan
        )
      );
      return true;
    },
    [applyModulesPayload]
  );

  const refresh = useCallback(async () => {
    const sitePlan = SITE_EMBED ? await fetchSitePlan() : null;

    if (!getAccessToken() && !SITE_EMBED) {
      setActive([]);
      setSimulation(null);
      setPlan(DEFAULT_PLAN);
      setLoading(false);
      return;
    }

    try {
      const data = await apiGet<{
        active: string[];
        catalog: ModuleCatalog;
        hasAnnual?: boolean;
        annualPrice?: number;
        simulation?: SimulationStatus;
        tier?: PricingTierId;
        selectedMarkets?: string[];
        allowedMarkets?: string[];
        features?: Record<string, boolean>;
        entitlements?: string[];
      }>(`/advisor/modules/${getUserId()}`);
      applyModulesPayload(applySitePlanToModulesPayload(data, sitePlan));
    } catch {
      if (sitePlan?.hasSubscription) {
        applySitePlanOnly(sitePlan);
      } else {
        setActive([]);
        setSimulation(null);
        setPlan(DEFAULT_PLAN);
      }
    } finally {
      setLoading(false);
    }
  }, [applyModulesPayload, applySitePlanOnly]);

  const triggerWinHook = useCallback(async (module: string) => {
    if (hasAnnual) return;
    try {
      const story = await apiGet<WinStory>(`/advisor/win-hook/${module}`);
      setWinStory(story);
      setWinModule(module);
      setWinOpen(true);
    } catch {
      /* ignore */
    }
  }, [hasAnnual]);

  const subscribeModule = useCallback(async (module: string) => {
    if (!getAccessToken()) {
      openAuth("register");
      return;
    }
    const acquisition_channel = resolveAcquisitionChannel();
    const res = await apiPost<{ checkoutUrl?: string; demoMode?: boolean }>(
      "/advisor/billing/module-checkout",
      {
        module,
        user_id: getUserId(),
        acquisition_channel,
        success_url: `${window.location.origin}/?sub=${module}`,
        cancel_url: window.location.href,
      }
    );
    if (res.checkoutUrl) {
      window.location.href = res.checkoutUrl;
    } else {
      await refresh();
      window.dispatchEvent(new Event("motivefx:platform-setup"));
      await triggerWinHook(module === "bundle" ? "trades" : module);
    }
  }, [refresh, triggerWinHook, openAuth]);

  const subscribeTier = useCallback(
    async (tier: PricingTierId, selectedMarkets: string[] = []) => {
      if (!getAccessToken()) {
        openAuth("register");
        return;
      }
      const acquisition_channel = resolveAcquisitionChannel();
      const res = await apiPost<{
        checkoutUrl?: string;
        demoMode?: boolean;
        tier?: PricingTierId;
        message?: string;
      }>("/advisor/billing/tier-checkout", {
        tier,
        selected_markets: selectedMarkets,
        user_id: getUserId(),
        acquisition_channel,
        success_url: `${window.location.origin}/?tier=${tier}`,
        cancel_url: `${window.location.origin}/#pricing`,
      });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        await refresh();
        window.dispatchEvent(new Event("motivefx:platform-setup"));
        window.dispatchEvent(new Event("motivefx:entitlements-changed"));
      }
    },
    [refresh, openAuth]
  );

  const subscribeAnnual = useCallback(async () => {
    if (!getAccessToken()) {
      openAuth("register");
      return;
    }
    const acquisition_channel = resolveAcquisitionChannel();
    const res = await apiPost<{ checkoutUrl?: string; demoMode?: boolean }>(
      "/advisor/billing/annual-checkout",
      {
        user_id: getUserId(),
        acquisition_channel,
        success_url: `${window.location.origin}/?annual=1`,
        cancel_url: window.location.href,
      }
    );
    if (res.checkoutUrl) {
      window.location.href = res.checkoutUrl;
    } else {
      await refresh();
      setWinOpen(false);
      window.dispatchEvent(new Event("motivefx:platform-setup"));
    }
  }, [refresh, openAuth]);

  useEffect(() => {
    const onAuth = () => {
      refresh();
    };
    const onEntitlements = () => {
      refresh();
    };
    window.addEventListener("motivefx:auth-changed", onAuth);
    window.addEventListener("motivefx:entitlements-changed", onEntitlements);
    return () => {
      window.removeEventListener("motivefx:auth-changed", onAuth);
      window.removeEventListener("motivefx:entitlements-changed", onEntitlements);
    };
  }, [refresh]);

  useEffect(() => {
    async function init() {
      if (authLoading) return;

      setLoading(true);
      if (SITE_EMBED) {
        await syncSiteEntitlementsFromServer(true);
      }
      const sitePlan = SITE_EMBED ? await fetchSitePlan() : null;

      if (!getAccessToken()) {
        if (SITE_EMBED) {
          applySitePlanOnly(sitePlan);
        }
        setLoading(false);
        return;
      }

      try {
        await apiPost("/advisor/demo/setup", { user_id: getUserId(), force: false });
      } catch {
        /* ok */
      }

      const params = new URLSearchParams(window.location.search);
      const sub = params.get("sub");
      const annual = params.get("annual");
      if (sub || annual) {
        window.history.replaceState({}, "", window.location.pathname);
      }

      let isAnnual = Boolean(sitePlan?.hasSubscription && sitePlan.tier === "elite");
      try {
        const data = await apiGet<{
          active: string[];
          catalog: ModuleCatalog;
          hasAnnual?: boolean;
          annualPrice?: number;
          simulation?: SimulationStatus;
          tier?: PricingTierId;
          selectedMarkets?: string[];
          allowedMarkets?: string[];
          features?: Record<string, boolean>;
          entitlements?: string[];
        }>(`/advisor/modules/${getUserId()}`);

        const merged = applySitePlanToModulesPayload(data, sitePlan);
        applyModulesPayload(merged);
        isAnnual = merged.hasAnnual ?? isAnnual;
      } catch {
        if (sitePlan?.hasSubscription) {
          const merged = applySitePlanToModulesPayload(
            { active: [], catalog: {}, allowedMarkets: [], hasAnnual: false },
            sitePlan
          );
          applyModulesPayload(merged);
          isAnnual = merged.hasAnnual ?? isAnnual;
        } else {
          setActive([]);
        }
      } finally {
        setLoading(false);
      }

      if (annual) {
        /* refresh already applied via annual checkout */
      } else if (sub && !isAnnual) {
        triggerWinHook(sub);
      } else if (
        !isAnnual &&
        !sitePlan?.hasSubscription &&
        !sessionStorage.getItem("motivefx_welcome_hook")
      ) {
        sessionStorage.setItem("motivefx_welcome_hook", "1");
        setTimeout(() => triggerWinHook("betting"), 2500);
      }
    }
    init();
  }, [triggerWinHook, isAuthenticated, authLoading, applyModulesPayload, applySitePlanOnly]);

  const allowedMarkets = plan.allowedMarkets;

  const hasModule = useCallback(
    (module: string) => {
      if (active.includes(module) && allowedMarkets.includes(module)) return true;
      return Boolean(simulation?.active && simulation.modules.includes(module));
    },
    [active, allowedMarkets, simulation]
  );

  const hasFeature = useCallback(
    (feature: EntitlementFeature) => hasFeatureFromMap(plan.features, feature),
    [plan.features]
  );

  const isSimulationOnly = useCallback(
    (module: string) => {
      if (active.includes(module) && allowedMarkets.includes(module)) return false;
      return Boolean(simulation?.active && simulation.modules.includes(module));
    },
    [active, allowedMarkets, simulation]
  );

  return (
    <ModulesContext.Provider
      value={{
        active,
        catalog,
        loading,
        hasAnnual,
        annualPrice,
        simulation,
        tier: plan.tier,
        plan,
        allowedMarkets,
        hasModule,
        hasFeature,
        isSimulationOnly,
        refresh,
        triggerWinHook,
        subscribeModule,
        subscribeAnnual,
        subscribeTier,
      }}
    >
      {children}
      {winOpen && winStory && !hasAnnual && (
        <WinHookModal
          story={winStory}
          subscribedModule={winModule}
          annualPrice={annualPrice}
          onUpgrade={subscribeAnnual}
          onDismiss={() => setWinOpen(false)}
        />
      )}
    </ModulesContext.Provider>
  );
}

export function useModules() {
  const ctx = useContext(ModulesContext);
  if (!ctx) throw new Error("useModules must be used within ModulesProvider");
  return ctx;
}
