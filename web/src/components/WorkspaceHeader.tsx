import {
  BookOpen,
  Home,
  LogIn,
  LogOut,
  Settings2,
  User,
  Users,
} from "lucide-react";
import type { TabId } from "../types";
import { brandForTab } from "../brand/moduleBrand";
import { useAuth } from "../hooks/useAuth";
import { useGenerationalProfile } from "../hooks/useGenerationalProfile";
import { usePlatformPrefs } from "../hooks/usePlatformPrefs";
import { isNativeShell } from "../lib/nativeShell";
import { AccountMenu } from "./AccountMenu";
import { AlertCenterBell } from "./AlertCenterBell";
import { MotiveFxBrandLogo } from "./MotivFxLogo";

interface Props {
  activeTab: TabId;
  statusLabel: string;
  onSelectTab: (tab: TabId) => void;
  onOpenGlossary: () => void;
}

export function WorkspaceHeader({ activeTab, statusLabel, onSelectTab, onOpenGlossary }: Props) {
  const brand = brandForTab(activeTab);
  const isHome = activeTab === "home";
  const { isAuthenticated, openAccount, openAuth, logout } = useAuth();
  const { openSetup } = usePlatformPrefs();
  const { profile, openSetup: openGenSetup } = useGenerationalProfile();
  const nativeShell = isNativeShell();

  return (
    <header className="workspace-header">
      <div className="workspace-header-top">
        <div className="workspace-header-left">
          <div className="workspace-header-brand-block workspace-header-brand-mobile">
            <MotiveFxBrandLogo compact />
          </div>
          {!isHome && (
            <div className="workspace-header-desktop-brand">
              <span className="workspace-module-badge">{brand.name.toUpperCase()}</span>
              <span className="workspace-header-dot">·</span>
              <p className="workspace-subheader">{brand.tagline}</p>
            </div>
          )}
        </div>
        <div className="workspace-header-right">
          <span className="monitor-only-pill" title="Monitor only — no execution">
            No Trading. No Buying. No Selling. Monitor Only.
          </span>
          <AlertCenterBell />
          <div className="workspace-header-desktop-chrome">
            <AccountMenu />
            <span className="workspace-header-divider" />
            <span className="status-dot" />
            <span className="workspace-status">{statusLabel}</span>
          </div>
        </div>
      </div>

      <nav className="mobile-header-toolbar" aria-label="Workspace controls">
        <button
          type="button"
          className={`mobile-header-tool ${activeTab === "home" ? "active" : ""}`}
          onClick={() => onSelectTab("home")}
        >
          <Home size={14} strokeWidth={2.2} />
          <span>Home</span>
        </button>
        <button
          type="button"
          className="mobile-header-tool"
          onClick={openSetup}
          aria-label="My apps and brokers"
        >
          <Settings2 size={14} strokeWidth={2.2} />
          <span>Apps</span>
        </button>
        <button type="button" className="mobile-header-tool" onClick={onOpenGlossary}>
          <BookOpen size={14} strokeWidth={2.2} />
          <span>Signal</span>
        </button>
        <button type="button" className="mobile-header-tool" onClick={openGenSetup}>
          <Users size={14} strokeWidth={2.2} />
          <span>{profile.name} mode</span>
        </button>
        {/* Native shell already exposes Account / Sign out in the RN chrome — avoid duplicate dead-looking controls. */}
        {!nativeShell &&
          (isAuthenticated ? (
            <>
              <button type="button" className="mobile-header-tool" onClick={openAccount}>
                <User size={14} strokeWidth={2.2} />
                <span>Account</span>
              </button>
              <button
                type="button"
                className="mobile-header-tool"
                onClick={() => {
                  void logout();
                }}
              >
                <LogOut size={14} strokeWidth={2.2} />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <button type="button" className="mobile-header-tool" onClick={() => openAuth("login")}>
              <LogIn size={14} strokeWidth={2.2} />
              <span>Sign in</span>
            </button>
          ))}
      </nav>

      <p className="mobile-header-monitor monitor-only-pill-compact" role="note">
        Monitor only — no trading
      </p>
    </header>
  );
}

export { TAB_TO_BRAND } from "../brand/moduleBrand";
