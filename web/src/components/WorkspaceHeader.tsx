import type { TabId } from "../types";
import { brandForTab, TAB_TO_BRAND } from "../brand/moduleBrand";
import { AccountMenu } from "./AccountMenu";
import { AlertCenterBell } from "./AlertCenterBell";

interface Props {
  activeTab: TabId;
  statusLabel: string;
}

export function WorkspaceHeader({ activeTab, statusLabel }: Props) {
  const brand = brandForTab(activeTab);

  return (
    <header className="workspace-header">
      <div className="workspace-header-left">
        <span className="workspace-module-badge">{brand.name.toUpperCase()}</span>
        <span className="workspace-header-dot">·</span>
        <p className="workspace-subheader">{brand.tagline}</p>
      </div>
      <div className="workspace-header-right">
        <AlertCenterBell />
        <AccountMenu />
        <span className="workspace-header-divider" />
        <span className="status-dot" />
        <span className="workspace-status">{statusLabel}</span>
      </div>
    </header>
  );
}

export { TAB_TO_BRAND };
