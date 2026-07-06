import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import {
  INTELLIGENCE_MARKETS,
  MARKET_TO_MODULE,
  type IntelligenceMarketId,
} from "../config/pricingTiers";

interface Props {
  tierName: string;
  pickCount: number;
  onConfirm: (modules: string[]) => void;
  onClose: () => void;
}

export function MarketPickerModal({ tierName, pickCount, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState<IntelligenceMarketId[]>([]);

  const labels = useMemo(
    () => Object.fromEntries(INTELLIGENCE_MARKETS.map((m) => [m.id, m.label])),
    []
  );

  function toggle(id: IntelligenceMarketId) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= pickCount) return prev;
      return [...prev, id];
    });
  }

  function handleConfirm() {
    if (selected.length !== pickCount) return;
    onConfirm(selected.map((id) => MARKET_TO_MODULE[id]));
    onClose();
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="market-picker-title">
      <div className="modal glass-card market-picker-modal">
        <header className="market-picker-header">
          <h2 id="market-picker-title">Choose your {pickCount} market{pickCount === 1 ? "" : "s"}</h2>
          <p>
            {tierName} includes exactly {pickCount} intelligence market{pickCount === 1 ? "" : "s"}.
            Pick now — this is locked to your subscription.
          </p>
        </header>
        <ul className="market-picker-list">
          {INTELLIGENCE_MARKETS.map((m) => {
            const on = selected.includes(m.id);
            const disabled = !on && selected.length >= pickCount;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  className={`market-picker-option ${on ? "selected" : ""}`}
                  disabled={disabled}
                  onClick={() => toggle(m.id)}
                >
                  <span>{m.label}</span>
                  {on && <Check size={18} />}
                </button>
              </li>
            );
          })}
        </ul>
        {selected.length > 0 && (
          <p className="market-picker-summary">
            Selected: {selected.map((id) => labels[id]).join(" · ")}
          </p>
        )}
        <div className="market-picker-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-accent-terminal"
            disabled={selected.length !== pickCount}
            onClick={handleConfirm}
          >
            Continue to checkout
          </button>
        </div>
      </div>
    </div>
  );
}
