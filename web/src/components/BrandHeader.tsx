import type { TabId } from "../types";
import { brandForTab } from "../brand/moduleBrand";
import { MotivFxLogo, MotivFxWordmark } from "./MotivFxLogo";

interface Props {
  activeTab: TabId;
  statusLabel: string;
}

export function BrandHeader({ activeTab, statusLabel }: Props) {
  const brand = brandForTab(activeTab);
  const brandId = brand.id;

  return (
    <header className="header brand-header">
      <div className="logo">
        <MotivFxLogo module={brandId} size={40} />
        <MotivFxWordmark module={brandId} />
      </div>
      <div className="header-actions">
        <span className="header-status">
          <span className="status-dot" />
          {statusLabel}
        </span>
      </div>
    </header>
  );
}
