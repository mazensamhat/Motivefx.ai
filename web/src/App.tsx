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
  { id: "betting", label: "Betting", module: "betting" },
  { id: "predictions", label: "Predictions", module: "predictions" },
];

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.get("view") === "admin";
  const legalPage = params.get("page");
  const resetToken = params.get("token") ?? "";
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const health = useApi<{ feeds: Record<string, boolean> }>("/health", 60_000);
  const { badges: pulseBadges } = useModulePulse(activeTab);
  const { hasModule, annualPrice, active: activeModules } = useModules();
  const { isAuthenticated, openAuth } = useAuth();
  const liveCount = Object.values(health.data?.feeds ?? {}).filter(Boolean).length;

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

  const statusLabel = health.data?.feeds?.openai
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

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return (
    <div className="app app-terminal" data-theme={TAB_TO_BRAND[activeTab]}>
      {!isAuthenticated && (
        <div className="launch-banner">
          <span>Create a free account to secure your data before launch.</span>
          <button type="button" className="btn btn-annual-cta" onClick={() => openAuth("register")}>
            Get started
          </button>
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
          <WorkspaceHeader activeTab={activeTab} statusLabel={statusLabel} />
          <LiveFeed />

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
              <a href="/?page=privacy">Privacy</a>
              <a href="/?page=terms">Terms</a>
              <a href="/?page=data-deletion">Data deletion</a>
              <a href="/?page=cookies">Cookies</a>
              <a href="/?page=disclaimer">Disclaimer</a>
              <a href="?view=admin" className="admin-footer-link">Ops Console</a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
