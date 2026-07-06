import { BookOpen, Home, Lock, Settings2, Users } from "lucide-react";
import { TAB_TO_BRAND, brandForTab } from "../brand/moduleBrand";
import { useGenerationalProfile } from "../hooks/useGenerationalProfile";
import { usePlatformPrefs } from "../hooks/usePlatformPrefs";
import { MotiveFxBrandLogo, MotivFxLogo } from "./MotivFxLogo";
import type { TabId } from "../types";

const NAV: { id: TabId; label: string; module: string; icon?: "home" }[] = [
  { id: "home", label: "Home", module: "home", icon: "home" },
  { id: "stocks", label: "Trades", module: "trades" },
  { id: "penny", label: "Pink Slips", module: "penny" },
  { id: "crypto", label: "Crypto", module: "crypto" },
  { id: "betting", label: "Betting", module: "betting" },
  { id: "predictions", label: "Predictions", module: "predictions" },
];

interface Props {
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
  hasModule: (module: string) => boolean;
  statusLabel: string;
  pulseBadges?: Record<string, number>;
  onOpenGlossary?: () => void;
}

export function ModuleSidebar({
  activeTab,
  onSelect,
  hasModule,
  statusLabel,
  pulseBadges = {},
  onOpenGlossary,
}: Props) {
  const { openSetup } = usePlatformPrefs();
  const { profile, openSetup: openGenSetup } = useGenerationalProfile();
  const activeBrand = brandForTab(activeTab);

  return (
    <aside className="module-sidebar glass-panel">
      <div className="sidebar-brand">
        <MotiveFxBrandLogo compact />
        {activeTab !== "home" && (
          <span className="sidebar-active-module" style={{ color: activeBrand.accent }}>
            {activeBrand.name}
          </span>
        )}
      </div>

      <div className="sidebar-label">Global Modules</div>
      <nav className="sidebar-nav">
        {NAV.map((t) => {
          const locked = t.module !== "home" && !hasModule(t.module);
          const active = activeTab === t.id;
          const pulse = t.module !== "home" ? pulseBadges[t.module] ?? 0 : 0;
          return (
            <button
              key={t.id}
              type="button"
              className={`sidebar-item ${active ? "active" : ""}`}
              data-brand={TAB_TO_BRAND[t.id]}
              onClick={() => onSelect(t.id)}
            >
              {t.icon === "home" ? (
                <Home size={20} className="sidebar-item-logo" style={{ color: active ? "var(--module-accent)" : undefined }} />
              ) : (
                <MotivFxLogo
                  module={TAB_TO_BRAND[t.id]}
                  size={28}
                  dimmed={!active}
                  className="sidebar-item-logo"
                />
              )}
              <span className="sidebar-item-text">
                {t.label}
                {locked && <Lock size={11} className="sidebar-lock" />}
                {pulse > 0 && !active && (
                  <span className="sidebar-pulse-badge">{pulse} new</span>
                )}
              </span>
              {active && <span className="sidebar-active-bar" />}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-row">
          <span className="sidebar-footer-label">Workspace status</span>
          <span className="sidebar-footer-live">
            <span className="status-dot" />
            Live Feed
          </span>
        </div>
        <button type="button" className="sidebar-apps-btn" onClick={openSetup}>
          <Settings2 size={12} />
          My Apps & Brokers
        </button>
        <button type="button" className="sidebar-apps-btn" onClick={onOpenGlossary}>
          <BookOpen size={12} />
          Signal Glossary
        </button>
        <button
          type="button"
          className="sidebar-apps-btn sidebar-gen-btn"
          onClick={openGenSetup}
          style={{ borderColor: `${profile.accent}30`, color: profile.accent }}
        >
          <Users size={12} />
          {profile.name} Mode
        </button>
        <div className="sidebar-footer-profile">
          <div className="sidebar-avatar">MI</div>
          <div>
            <p className="sidebar-profile-name">Motive Investor</p>
            <p className="sidebar-profile-meta">{statusLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
