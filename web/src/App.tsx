import { useState, useEffect } from "react";
import { AdminDashboard } from "./components/AdminDashboard";
import { IntelTour } from "./components/IntelTour";
import { SignalGlossaryModal } from "./components/SignalGlossaryModal";
import { LiveFeed } from "./components/LiveFeed";
import { BillingFinePrint } from "./components/BillingFinePrint";
import { FinancialDisclaimer } from "./components/FinancialDisclaimer";
import { TierPricing } from "./components/TierPricing";
import { ModuleGate } from "./components/ModuleGate";
import { ModuleSidebar } from "./components/ModuleSidebar";
import { MobileBottomNav } from "./components/MobileNav";
import { WorkspaceHeader } from "./components/WorkspaceHeader";
import { TabBetting } from "./components/TabBetting";
import { TabCrypto } from "./components/TabCrypto";
import { TabHome } from "./components/TabHome";
import { TabPenny } from "./components/TabPenny";
import { TabPredictions } from "./components/TabPredictions";
import { TabStocks } from "./components/TabStocks";
import { useApi } from "./hooks/useApi";
import { useModules } from "./hooks/useModules";
import { useAuth } from "./hooks/useAuth";
import { useModulePulse } from "./hooks/useModulePulse";
import { PlatformSetupGate } from "./hooks/usePlatformPrefs";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { DataDeletionPage } from "./pages/DataDeletionPage";
import { CookiePolicyPage } from "./pages/CookiePolicyPage";
import { DisclaimerPage } from "./pages/DisclaimerPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { TAB_TO_BRAND } from "./brand/moduleBrand";
import type { TabId } from "./types";

const TABS: { id: TabId; label: string; module: string }[] = [
  { id: "home", label: "Home", module: "home" },
  { id: "stocks", label: "Trades", module: "trades" },
  { id: "penny", label: "Pink Slips", module: "penny" },
  { id: "crypto", label: "Crypto", module: "crypto" },
  { id: "betting", label: "Bets", module: "betting" },
  { id: "predictions", label: "Polymarket", module: "predictions" },
];

const TAB_IDS = new Set<TabId>(TABS.map((t) => t.id));
const SITE_EMBED = import.meta.env.BASE_URL === "/terminal/";

function legalHref(page: string) {
  return SITE_EMBED ? `/terminal/?page=${page}` : `/?page=${page}`;
}

function initialTabFromUrl(): TabId {
  const tab = new URLSearchParams(window.location.search).get("tab");
  if (tab && TAB_IDS.has(tab as TabId)) return tab as TabId;
  return "home";
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const legacyAdminView = !SITE_EMBED && params.get("view") === "admin";
  const legalPage = params.get("page");
  const resetToken = params.get("token") ?? "";
  const isPublicDemo =
    params.get("demo") === "1" ||
    (typeof document !== "undefined" &&
      document.cookie.split(";").some((c) => c.trim().startsWith("motivefx_demo=1")));
  const [activeTab, setActiveTab] = useState<TabId>(initialTabFromUrl);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const health = useApi<{
    feeds: Record<string, boolean>;
    quota?: { the_odds_api?: { remaining: number | null; used: number | null } };
  }>("/health", 60_000);
  const { badges: pulseBadges } = useModulePulse(activeTab);
  const { hasModule, annualPrice, active: activeModules } = useModules();
  const { isAuthenticated, openAuth, isAdmin } = useAuth();
  const liveCount = Object.values(health.data?.feeds ?? {}).filter(Boolean).length;
  const oddsRemaining = health.data?.quota?.the_odds_api?.remaining;

  const active = TABS.find((t) => t.id === activeTab)!;

  useEffect(() => {
    const onEntitlements = () => {
      if (activeTab !== "home" && !hasModule(active.module)) {
        setActiveTab("home");
      }
    };
    window.addEventListener("motivefx:entitlements-changed", onEntitlements);
    return () => window.removeEventListener("motivefx:entitlements-changed", onEntitlements);
  }, [activeTab, active.module, hasModule]);

  const statusLabel =
    oddsRemaining != null && Number.isFinite(oddsRemaining)
      ? `Odds ${Math.round(oddsRemaining).toLocaleString()} left`
      : health.data?.feeds?.openai
        ? "GPT insights live"
        : liveCount > 0
          ? `${liveCount} feeds`
          : "Free data mode";

  if (legalPage === "privacy") return <PrivacyPage />;
  if (legalPage === "terms") return <TermsPage />;
  if (legalPage === "data-deletion") return <DataDeletionPage />;
  if (legalPage === "cookies") return <CookiePolicyPage />;
  if (legalPage === "disclaimer") return <DisclaimerPage />;
  if (legalPage === "forgot-password") return <ForgotPasswordPage />;
  if (legalPage === "reset-password") return <ResetPasswordPage token={resetToken} />;

  if (legacyAdminView) {
    return <AdminDashboard />;
  }

  return (
    <div className="app app-terminal" data-theme={TAB_TO_BRAND[activeTab]}>
      {!isAuthenticated && !SITE_EMBED && (
        <div className="launch-banner">
          <span>Create a free account to secure your data before launch.</span>
          <button type="button" className="btn btn-annual-cta" onClick={() => openAuth("register")}>
            Get started
          </button>
        </div>
      )}
      {isPublicDemo && !isAuthenticated && (
        <div className="launch-banner" style={{ background: "rgba(34, 197, 94, 0.12)" }}>
          <span>
            Read-only public demo — sample &amp; live feeds for exploration. Sign up to save portfolios and
            subscribe.
          </span>
          <a className="btn btn-annual-cta" href="/pricing">
            Start free trial
          </a>
        </div>
      )}
      <PlatformSetupGate activeModules={activeModules} />
      <IntelTour />
      {glossaryOpen && <SignalGlossaryModal onClose={() => setGlossaryOpen(false)} />}
      <div className="app-body">
        <ModuleSidebar
          activeTab={activeTab}
          onSelect={setActiveTab}
          hasModule={hasModule}
          statusLabel={statusLabel}
          pulseBadges={pulseBadges}
          onOpenGlossary={() => setGlossaryOpen(true)}
        />

        <div className="app-content">
          <WorkspaceHeader
            activeTab={activeTab}
            statusLabel={statusLabel}
            onSelectTab={setActiveTab}
            onOpenGlossary={() => setGlossaryOpen(true)}
          />
          <LiveFeed />
          <div className="monitor-only-strip" role="note">
            No Trading. No Buying. No Selling. Monitor Only.
          </div>

          <main className="main terminal-main">
            {activeTab === "home" ? (
              <TabHome onNavigate={setActiveTab} onOpenGlossary={() => setGlossaryOpen(true)} />
            ) : (
              <ModuleGate module={active.module} moduleLabel={active.label}>
                {activeTab === "stocks" && <TabStocks />}
                {activeTab === "penny" && <TabPenny />}
                {activeTab === "crypto" && <TabCrypto />}
                {activeTab === "betting" && <TabBetting />}
                {activeTab === "predictions" && <TabPredictions />}
              </ModuleGate>
            )}
            <TierPricing />
          </main>

          <footer className="app-footer">
            <FinancialDisclaimer compact />
            <BillingFinePrint annualPrice={annualPrice} />
            <div className="app-footer-links">
              <a href="/legal-documents.html" target="_blank" rel="noreferrer">All legal documents</a>
              <a href={legalHref("privacy")}>Privacy</a>
              <a href={legalHref("terms")}>Terms</a>
              <a href={legalHref("data-deletion")}>Data deletion</a>
              <a href={legalHref("cookies")}>Cookies</a>
              <a href={legalHref("disclaimer")}>Disclaimer</a>
              {SITE_EMBED && <a href="/app/settings">Site account</a>}
              {SITE_EMBED && isAdmin && <a href="/admin">Ops Console</a>}
              {!SITE_EMBED && (
                <a href="?view=admin" className="admin-footer-link">Ops Console</a>
              )}
            </div>
          </footer>
        </div>
      </div>

      <MobileBottomNav activeTab={activeTab} onSelect={setActiveTab} />
    </div>
  );
}
