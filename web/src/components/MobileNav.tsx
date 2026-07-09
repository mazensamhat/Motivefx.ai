import { MotivFxLogo } from "./MotivFxLogo";
import { TAB_TO_BRAND } from "../brand/moduleBrand";
import type { TabId } from "../types";

/** Trading modules only — workspace chrome lives in the mobile header toolbar. */
const BOTTOM_MODULES: { id: TabId; label: string }[] = [
  { id: "stocks", label: "Trades" },
  { id: "crypto", label: "Crypto" },
  { id: "betting", label: "Bets" },
  { id: "penny", label: "Pink Slips" },
  { id: "predictions", label: "Polymarket" },
];

interface BottomNavProps {
  activeTab: TabId;
  onSelect: (tab: TabId) => void;
}

export function MobileBottomNav({ activeTab, onSelect }: BottomNavProps) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Trading modules">
      {BOTTOM_MODULES.map((tab) => {
        const active = activeTab === tab.id;
        const brand = TAB_TO_BRAND[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            className={`mobile-bottom-nav-item ${active ? "active" : ""}`}
            data-brand={brand}
            onClick={() => onSelect(tab.id)}
            aria-current={active ? "page" : undefined}
          >
            <MotivFxLogo module={brand} size={22} dimmed={!active} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
