import { BookOpen, Home, LayoutGrid, LogOut, Settings2, User, Users } from "lucide-react";
import { MotivFxLogo } from "./MotivFxLogo";
import { TAB_TO_BRAND } from "../brand/moduleBrand";
import { useAuth } from "../hooks/useAuth";
import type { TabId } from "../types";

const PRIMARY: { id: TabId; label: string; module: string }[] = [
  { id: "home", label: "Home", module: "home" },
  { id: "stocks", label: "Trades", module: "trades" },
  { id: "crypto", label: "Crypto", module: "crypto" },
  { id: "betting", label: "Bets", module: "betting" },
];

interface BottomNavProps {
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
  onOpenMore: () => void;
}

export function MobileBottomNav({ activeTab, onSelect, onOpenMore }: BottomNavProps) {
  const moreActive = activeTab === "penny" || activeTab === "predictions";

  return (
    <nav className="mobile-bottom-nav" aria-label="Main navigation">
      {PRIMARY.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`mobile-bottom-nav-item ${active ? "active" : ""}`}
            data-brand={TAB_TO_BRAND[tab.id]}
            onClick={() => onSelect(tab.id)}
            aria-current={active ? "page" : undefined}
          >
            {tab.id === "home" ? (
              <Home size={22} strokeWidth={active ? 2.4 : 2} />
            ) : (
              <MotivFxLogo module={TAB_TO_BRAND[tab.id]} size={24} dimmed={!active} />
            )}
            <span>{tab.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        className={`mobile-bottom-nav-item ${moreActive ? "active" : ""}`}
        onClick={onOpenMore}
        aria-expanded={moreActive}
      >
        <LayoutGrid size={22} />
        <span>More</span>
      </button>
    </nav>
  );
}

interface MoreSheetProps {
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
  onOpenApps: () => void;
  onOpenGlossary: () => void;
  onOpenGenMode: () => void;
  genModeLabel?: string;
  onClose: () => void;
}

const MORE_TABS: { id: TabId; label: string }[] = [
  { id: "penny", label: "Pink Slips" },
  { id: "predictions", label: "Predictions" },
];

export function MobileMoreSheet({
  activeTab,
  onSelect,
  onOpenApps,
  onOpenGlossary,
  onOpenGenMode,
  genModeLabel = "Investor mode",
  onClose,
}: MoreSheetProps) {
  const { isAuthenticated, openAccount, openAuth, logout } = useAuth();

  return (
    <div className="mobile-more-overlay" onClick={onClose} role="presentation">
      <div
        className="mobile-more-sheet glass-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="More options"
      >
        <div className="mobile-more-handle" aria-hidden />
        <h2 className="mobile-more-title">More</h2>

        <div className="mobile-more-section">
          <p className="mobile-more-label">Markets</p>
          {MORE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`mobile-more-row ${activeTab === tab.id ? "active" : ""}`}
              data-brand={TAB_TO_BRAND[tab.id]}
              onClick={() => {
                onSelect(tab.id);
                onClose();
              }}
            >
              <MotivFxLogo module={TAB_TO_BRAND[tab.id]} size={22} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="mobile-more-section">
          <p className="mobile-more-label">Workspace</p>
          <button type="button" className="mobile-more-row" onClick={() => { onOpenApps(); onClose(); }}>
            <Settings2 size={18} />
            <span>My Apps &amp; Brokers</span>
          </button>
          <button type="button" className="mobile-more-row" onClick={() => { onOpenGlossary(); onClose(); }}>
            <BookOpen size={18} />
            <span>Signal Glossary</span>
          </button>
          <button type="button" className="mobile-more-row" onClick={() => { onOpenGenMode(); onClose(); }}>
            <Users size={18} />
            <span>{genModeLabel}</span>
          </button>
        </div>

        <div className="mobile-more-section">
          <p className="mobile-more-label">Account</p>
          {isAuthenticated ? (
            <>
              <button
                type="button"
                className="mobile-more-row"
                onClick={() => {
                  openAccount();
                  onClose();
                }}
              >
                <User size={18} />
                <span>Account</span>
              </button>
              <button
                type="button"
                className="mobile-more-row"
                onClick={() => {
                  void logout();
                  onClose();
                }}
              >
                <LogOut size={18} />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="mobile-more-row"
              onClick={() => {
                openAuth("login");
                onClose();
              }}
            >
              <User size={18} />
              <span>Sign in</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
