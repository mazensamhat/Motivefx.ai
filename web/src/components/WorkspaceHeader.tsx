import type { TabId } from "../types";
import { brandForTab } from "../brand/moduleBrand";
import { AccountMenu } from "./AccountMenu";
import { AlertCenterBell } from "./AlertCenterBell";

interface Props {
  activeTab: TabId;
  statusLabel: string;
}

export function WorkspaceHeader({ activeTab, statusLabel }: Props) {
  const brand = brandForTab(activeTab);
  const isHome = activeTab === "home";

  return (
    <header className="workspace-header">
      <div className="workspace-header-left">
        {isHome ? (
          <div className="workspace-header-brand-block">
            <div className="workspace-header-brand-title">
              MOTIVEFX<span className="ai-chip">AI</span>
            </div>
            <p className="workspace-header-edge">AI-Powered Markets. Real-Time Edge.</p>
          </div>
        ) : (
          <>
            <span className="workspace-module-badge">{brand.name.toUpperCase()}</span>
            <span className="workspace-header-dot">·</span>
            <p className="workspace-subheader">{brand.tagline}</p>
          </>
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
    </header>
  );
}

export { TAB_TO_BRAND } from "../brand/moduleBrand";
