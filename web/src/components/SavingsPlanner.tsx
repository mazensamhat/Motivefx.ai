import { useMemo, useState } from "react";
import { MODULE_BRAND } from "../brand/moduleBrand";
import {
  BUNDLE_PRICE,
  MODULE_PRICE,
  calcSavings,
  dailyAnnualCost,
  monthlyAnnualEquiv,
} from "../config/subscriptionHooks";
import { useGenerationalProfile } from "../hooks/useGenerationalProfile";

const PLAN_MODULES = [
  { id: "trades", label: "Trades Option Block Flow" },
  { id: "penny", label: "Pink Slips Penny Scanner" },
  { id: "crypto", label: "Crypto On-Chain Whale Tracker" },
  { id: "betting", label: "Sharp Sports Betting Lines" },
  { id: "predictions", label: "Predictions Geopolitical Markets" },
];

interface Props {
  annualPrice: number;
  onUpgradeAnnual?: () => void;
}

export function SavingsPlanner({ annualPrice, onUpgradeAnnual }: Props) {
  const { profile } = useGenerationalProfile();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(["trades", "penny", "crypto"])
  );

  const breakdown = useMemo(
    () => calcSavings([...selected], annualPrice, MODULE_PRICE, BUNDLE_PRICE),
    [selected, annualPrice]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="savings-planner glass-panel">
      <div className="savings-planner-header">
        <h3 className="savings-planner-title">Interactive Savings Planner</h3>
        <p className="savings-planner-sub">
          Select modules to compare à la carte, bundle, and annual all-access math.
        </p>
      </div>

      <div className="savings-planner-modules">
        <span className="savings-planner-label">Select active modules</span>
        {PLAN_MODULES.map((m) => {
          const brand = m.id === "penny" ? "pinkslips" : (m.id as keyof typeof MODULE_BRAND);
          const accent = MODULE_BRAND[brand]?.accent ?? "#00e676";
          const checked = selected.has(m.id);
          return (
            <label
              key={m.id}
              className={`savings-module-row ${checked ? "checked" : ""}`}
              style={{ ["--row-accent" as string]: accent }}
            >
              <span className="savings-module-left">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(m.id)}
                />
                <span>{m.label}</span>
              </span>
              <span className="savings-module-price">${MODULE_PRICE}/mo</span>
            </label>
          );
        })}
      </div>

      <div className="savings-math-table">
        <div className="savings-math-head">
          <span>Tier</span>
          <span>Yearly total</span>
          <span>Monthly cost</span>
        </div>
        <div className="savings-math-row">
          <span>À la carte</span>
          <span>${breakdown.alacarteYearly.toLocaleString()}</span>
          <span>${breakdown.alacarteMonthly}/mo</span>
        </div>
        <div className={`savings-math-row ${breakdown.bundleActive ? "highlight" : "dim"}`}>
          <span>Monthly bundle</span>
          <span>${breakdown.bundleYearly.toLocaleString()}</span>
          <span>${BUNDLE_PRICE}/mo{breakdown.bundleActive ? " · active" : ""}</span>
        </div>
        <div className="savings-math-row savings-math-annual">
          <span>Annual All-Access</span>
          <span>${annualPrice.toLocaleString()}</span>
          <span>${monthlyAnnualEquiv(annualPrice)}/mo</span>
        </div>
      </div>

      <div className="savings-feedback">
        <span className="savings-feedback-badge">Guaranteed conversion lift</span>
        {breakdown.savings > 0 ? (
          <p className="savings-feedback-value">
            Saves <strong>${breakdown.savings.toFixed(2)}</strong> / year
          </p>
        ) : (
          <p className="savings-feedback-value savings-feedback-upsell">
            All five modules for <strong>${annualPrice}/yr</strong>
          </p>
        )}
        <p className="savings-feedback-sub">{breakdown.savingsLabel}</p>
        <p className="savings-feedback-daily">
          Annual works out to <strong>${dailyAnnualCost(annualPrice)}/day</strong> — {profile.dailyCostFraming}.
        </p>
      </div>

      {onUpgradeAnnual && (
        <button
          type="button"
          className="btn btn-annual-cta savings-planner-cta"
          style={{ backgroundColor: profile.accent, color: profile.id === "boomer" ? "#fff" : "#000" }}
          onClick={onUpgradeAnnual}
        >
          {profile.upgradeButtonText}
        </button>
      )}
    </div>
  );
}
