import { DataHealthNotice } from "./components/DataHealthNotice";
import { lazy, Suspense, useState, useEffect } from "react";
import { LiveFeed } from "./components/LiveFeed";
import { BillingFinePrint } from "./components/BillingFinePrint";
import { FinancialDisclaimer } from "./components/FinancialDisclaimer";
import { ModuleGate } from "./components/ModuleGate";
import { ModuleSidebar } from "./components/ModuleSidebar";
import { MobileBottomNav } from "./components/MobileNav";
import { WorkspaceHeader } from "./components/WorkspaceHeader";
import { useApi } from "./hooks/useApi";
import { useModules } from "./hooks/useModules";
import { useAuth } from "./hooks/useAuth";
import { useModulePulse } from "./hooks/useModulePulse";
import { useModuleUsageTracker } from "./hooks/useModuleUsageTracker";
import { PlatformSetupGate } from "./hooks/usePlatformPrefs";
import { isNativeIosShell, isNativeShell, syncNativeShellDocumentClass } from "./lib/nativeShell";
import { TAB_TO_BRAND } from "./brand/moduleBrand";
import type { TabId } from "./types";

const AdminDashboard = lazy(() =>
  import("./components/AdminDashboard").then((m) => ({ default: m.AdminDashboard }))
);
const MotiveV2Home = lazy(() =>
  import("./components/MotiveV2Home").then((m) => ({ default: m.MotiveV2Home }))
);
const TierPricing = lazy(() =>
  import("./components/TierPricing").then((m) => ({ default: m.TierPricing }))
);
const IntelTour = lazy(() =>
  import("./components/IntelTour").then((m) => ({ default: m.IntelTour }))
);
const ChiefOfFinanceAssistant = lazy(() =>
  import("./features/ask-motive/ChiefOfFinanceAssistant").then((m) => ({
    default: m.ChiefOfFinanceAssistant,
  }))
);
const SignalGlossaryModal = lazy(() =>
  import("./components/SignalGlossaryModal").then((m) => ({ default: m.SignalGlossaryModal }))
);
const TabStocks = lazy(() =>
  import("./components/TabStocks").then((m) => ({ default: m.TabStocks }))
);
const TabPenny = lazy(() =>
  import("./components/TabPenny").then((m) => ({ default: m.TabPenny }))
);
const TabCrypto = lazy(() =>
  import("./components/TabCrypto").then((m) => ({ default: m.TabCrypto }))
);
const TabBetting = lazy(() =>
  import("./components/TabBetting").then((m) => ({ default: m.TabBetting }))
);
const TabPredictions = lazy(() =>
  import("./components/TabPredictions").then((m) => ({ default: m.TabPredictions }))
);
const PrivacyPage = lazy(() =>
  import("./pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage }))
);
const TermsPage = lazy(() =>
  import("./pages/TermsPage").then((m) => ({ default: m.TermsPage }))
);
const DataDeletionPage = lazy(() =>
  import("./pages/DataDeletionPage").then((m) => ({ default: m.DataDeletionPage }))
);
const CookiePolicyPage = lazy(() =>
  import("./pages/CookiePolicyPage").then((m) => ({ default: m.CookiePolicyPage }))
);
const DisclaimerPage = lazy(() =>
  import("./pages/DisclaimerPage").then((m) => ({ default: m.DisclaimerPage }))
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import("./pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage }))
);

function LoadingSurface() {
  return <div className="empty-state">Loading MotiveFX…</div>;
}

const TABS: { id: TabId; label: string; module: string }[] = [
  { id: "home", label: "Home", module: "home" },
  { id: "stocks", label: "Trades", module: "trades" },
  { id: "penny", label: "Pink Slips", module: "penny" },
  { id: "crypto", label: "Crypto", module: "crypto" },
  { id: "betting", label: "Bets", module: "betting" },
  { id: "predictions", label: "Predictions", module: "predictions" },
];
const TAB_IDS = new Set<TabId>(TABS.map((t) => t.id));
const SITE_EMBED = import.meta.env.BASE_URL === "/terminal/";
function playSafeModuleLabel(tab: { id: TabId; label: string }) {
  if (!isNativeShell()) return tab.label;
  if (tab.id === "betting") return "Odds intel";
  if (tab.id === "predictions") return "Event intel";
  return tab.label;
}
function legalHref(page: string) { return SITE_EMBED ? `/terminal/?page=${page}` : `/?page=${page}`; }
function initialTabFromUrl(): TabId {
  const tab = new URLSearchParams(window.location.search).get("tab");
  return tab && TAB_IDS.has(tab as TabId) ? tab as TabId : "home";
}
export default function App() {
  const params = new URLSearchParams(window.location.search);
  const legacyAdminView = !SITE_EMBED && params.get("view") === "admin";
  const legalPage = params.get("page");
  const resetToken = params.get("token") ?? "";
  const isPublicDemo = params.get("demo") === "1" || (typeof document !== "undefined" && document.cookie.split(";").some((c) => c.trim().startsWith("motivefx_demo=1")));
  const [activeTab, setActiveTab] = useState<TabId>(initialTabFromUrl);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const health = useApi<{ feeds: Record<string, boolean>; quota?: {
    sharp_api?: { remaining: number | null; limit?: number | null };
    the_odds_api?: { remaining: number | null; used: number | null };
  } }>("/health", 60_000);
  const { badges: pulseBadges } = useModulePulse(activeTab);
  const { hasModule, annualPrice, active: activeModules } = useModules();
  const { isAuthenticated, openAuth, isAdmin, loading: authLoading, error: authError, refreshUser } = useAuth();
  useModuleUsageTracker(activeTab);
  const liveCount = Object.values(health.data?.feeds ?? {}).filter(Boolean).length;
  const sharpRemaining = health.data?.quota?.sharp_api?.remaining;
  const oddsRemaining = health.data?.quota?.the_odds_api?.remaining;
  const preferredRemaining = sharpRemaining != null && Number.isFinite(sharpRemaining) ? sharpRemaining : oddsRemaining;
  const preferredQuotaLabel = sharpRemaining != null && Number.isFinite(sharpRemaining) ? "Sharp" : "Odds";
  const active = TABS.find((t) => t.id === activeTab)!;
  useEffect(() => {
    const onEntitlements = () => { if (activeTab !== "home" && !hasModule(active.module)) setActiveTab("home"); };
    window.addEventListener("motivefx:entitlements-changed", onEntitlements);
    return () => window.removeEventListener("motivefx:entitlements-changed", onEntitlements);
  }, [activeTab, active.module, hasModule]);
  useEffect(() => { syncNativeShellDocumentClass(); }, []);
  const statusLabel = preferredRemaining != null && Number.isFinite(preferredRemaining)
    ? `${preferredQuotaLabel} ${Math.round(preferredRemaining).toLocaleString()} left`
    : health.data?.feeds?.openai ? "GPT insights live" : liveCount > 0 ? `${liveCount} feeds` : "Free data mode";
  if (legalPage === "privacy") return <Suspense fallback={<LoadingSurface />}><PrivacyPage /></Suspense>;
  if (legalPage === "terms") return <Suspense fallback={<LoadingSurface />}><TermsPage /></Suspense>;
  if (legalPage === "data-deletion") return <Suspense fallback={<LoadingSurface />}><DataDeletionPage /></Suspense>;
  if (legalPage === "cookies") return <Suspense fallback={<LoadingSurface />}><CookiePolicyPage /></Suspense>;
  if (legalPage === "disclaimer") return <Suspense fallback={<LoadingSurface />}><DisclaimerPage /></Suspense>;
  if (legalPage === "forgot-password") return <Suspense fallback={<LoadingSurface />}><ForgotPasswordPage /></Suspense>;
  if (legalPage === "reset-password") return <Suspense fallback={<LoadingSurface />}><ResetPasswordPage token={resetToken} /></Suspense>;
  if (legacyAdminView) return <Suspense fallback={<LoadingSurface />}><AdminDashboard /></Suspense>;
  return <div className="app app-terminal" data-theme={TAB_TO_BRAND[activeTab]}>
    {!isAuthenticated && !SITE_EMBED && !authLoading && !authError && <div className="launch-banner">
      <span>Create a free account to secure your data before launch.</span><button type="button" className="btn btn-annual-cta" onClick={() => openAuth("register")}>Get started</button>
    </div>}
    {isPublicDemo && !isAuthenticated && !authLoading && !authError && <div className="launch-banner" style={{ background: "rgba(34, 197, 94, 0.12)" }}>
      <span>{isNativeIosShell() ? "Free informational reader — browse market insights without an account. Sign-in is optional." : "Read-only public demo — sample & live feeds for exploration. Sign up to save portfolios."}</span>
      {isNativeIosShell() ? <button type="button" className="btn btn-annual-cta" onClick={() => openAuth("login")}>Sign in (optional)</button>
        : isNativeShell() ? <button type="button" className="btn btn-annual-cta" onClick={() => openAuth("register")}>Create account</button>
        : <a className="btn btn-annual-cta" href="/pricing">Start free trial</a>}
    </div>}
    {authError && <div className="launch-banner" role="alert"><span>{authError}</span><button className="btn" type="button" onClick={() => void refreshUser()}>Retry account</button></div>}
    <PlatformSetupGate activeModules={activeModules} />
    <Suspense fallback={null}><IntelTour /></Suspense>
    {glossaryOpen && (
      <Suspense fallback={null}>
        <SignalGlossaryModal onClose={() => setGlossaryOpen(false)} />
      </Suspense>
    )}
    <div className="app-body">
      <ModuleSidebar activeTab={activeTab} onSelect={setActiveTab} hasModule={hasModule} statusLabel={statusLabel} pulseBadges={pulseBadges} onOpenGlossary={() => setGlossaryOpen(true)} />
      <div className="app-content">
        <WorkspaceHeader activeTab={activeTab} statusLabel={statusLabel} onSelectTab={setActiveTab} onOpenGlossary={() => setGlossaryOpen(true)} />
        <LiveFeed />
        <main className="main terminal-main">
          <DataHealthNotice />
          {activeTab === "home" ? <Suspense fallback={<LoadingSurface />}><MotiveV2Home onNavigate={setActiveTab} /></Suspense> : (
            <ModuleGate module={active.module} moduleLabel={playSafeModuleLabel(active)}>
              <Suspense fallback={<LoadingSurface />}>
                {activeTab === "stocks" && <TabStocks />}
                {activeTab === "penny" && <TabPenny />}
                {activeTab === "crypto" && <TabCrypto />}
                {activeTab === "betting" && <TabBetting />}
                {activeTab === "predictions" && <TabPredictions />}
              </Suspense>
            </ModuleGate>
          )}
          <Suspense fallback={null}><TierPricing /></Suspense>
        </main>
        <footer className="app-footer">
          <div className="app-footer-legal-desktop"><FinancialDisclaimer compact />{!isNativeIosShell() && <BillingFinePrint annualPrice={annualPrice} />}</div>
          <div className="app-footer-legal-mobile"><FinancialDisclaimer mobile />{!isNativeIosShell() && <BillingFinePrint annualPrice={annualPrice} compact />}</div>
          <div className="app-footer-links">
            {!isNativeIosShell() && <a href="/legal-documents.html" target="_blank" rel="noreferrer">Legal</a>}
            <a href={legalHref("privacy")}>Privacy</a><a href={legalHref("terms")}>Terms</a><a href={legalHref("data-deletion")}>Data deletion</a>
            {!isNativeIosShell() && <a href={legalHref("cookies")}>Cookies</a>}<a href={legalHref("disclaimer")}>Disclaimer</a>
            {SITE_EMBED && !isNativeShell() && <a href="/app/settings">Site account</a>}
            {SITE_EMBED && isAdmin && !isNativeShell() && <a href="/admin">Ops Console</a>}
            {!SITE_EMBED && <a href="?view=admin" className="admin-footer-link">Ops Console</a>}
          </div>
        </footer>
      </div>
    </div>
    <MobileBottomNav activeTab={activeTab} onSelect={setActiveTab} />
    <Suspense fallback={null}><ChiefOfFinanceAssistant activeTab={activeTab} onNavigate={setActiveTab} /></Suspense>
  </div>;
}
