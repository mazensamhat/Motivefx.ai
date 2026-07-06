import { APP_MODULE_TO_BRAND, type BrandModuleId } from "../brand/moduleBrand";
import { dailyAnnualCost, monthlyAnnualEquiv } from "../config/subscriptionHooks";
import { useModules } from "../hooks/useModules";
import { useGenerationalProfile } from "../hooks/useGenerationalProfile";
import { ModuleBrandLockup } from "./MotivFxLogo";
import { SavingsPlanner } from "./SavingsPlanner";
import { ImpactCalculator } from "./ImpactCalculator";
import { Boxes, Lock, ShieldAlert, Wallet } from "lucide-react";

const MODULES = [
  { id: "trades", name: "Trades", price: 29, desc: "Holdings intel · stock activity · congress flow" },
  { id: "penny", name: "Pink Slips", price: 29, desc: "Penny stock scanner · pink slip holdings intel" },
  { id: "crypto", name: "Crypto", price: 29, desc: "Spot activity · Polymarket · crypto holdings intel" },
  { id: "betting", name: "Betting", price: 29, desc: "Sports bet flow · sharp signals · line moves" },
  { id: "predictions", name: "Predictions", price: 29, desc: "War · politics · celebrity event markets" },
];

const ALL_MODULES = MODULES.map((m) => m.id);

function ModuleStatusBadge({ brand, active }: { brand: BrandModuleId; active: boolean }) {
  if (!active) return null;
  return (
    <span className="module-status-badge" data-brand={brand}>
      Active
    </span>
  );
}

export function ModulePricing() {
  const { hasModule, hasAnnual, annualPrice, subscribeModule, subscribeAnnual } = useModules();
  const { profile } = useGenerationalProfile();
  const ownsAll = ALL_MODULES.every((m) => hasModule(m));

  return (
    <div className="module-pricing glass-panel pricing-terminal">
      <div className="module-pricing-header">
        <h3 className="pricing-terminal-title">{profile.tagline}</h3>
        <p className="pricing-terminal-sub">
          {profile.pricingHeadline} · ${annualPrice}/yr all-access · {profile.name} optimized
        </p>
      </div>

      <div className="pricing-promo-row">
        {!hasAnnual ? (
          <div
            className="pricing-promo-card annual-banner-bold"
            onClick={() => subscribeAnnual()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && subscribeAnnual()}
          >
            <div className="annual-banner-glow" aria-hidden />
            <div className="annual-banner-body">
              <span className="annual-banner-badge">Best Value</span>
              <div className="annual-banner-title">Annual All-Access — ${annualPrice}/yr</div>
              <div className="annual-banner-sub">
                {profile.priceFraming} · ${monthlyAnnualEquiv(annualPrice)}/mo equiv · ${dailyAnnualCost(annualPrice)}/day
              </div>
            </div>
            <button
              className="btn btn-annual-cta"
              type="button"
              onClick={(e) => { e.stopPropagation(); subscribeAnnual(); }}
            >
              {profile.ctaButtonText}
            </button>
          </div>
        ) : (
          <div className="pricing-promo-card annual-banner-bold owned">
            <div className="annual-banner-glow" aria-hidden />
            <div className="annual-banner-body">
              <span className="annual-banner-badge">All Access</span>
              <div className="annual-banner-title">Annual All-Access Active</div>
              <div className="annual-banner-sub">Full year · all modules unlocked</div>
            </div>
            <ModuleStatusBadge brand="predictions" active />
          </div>
        )}

        <div className={`pricing-promo-card bundle-banner bundle-banner-bold ${ownsAll || hasAnnual ? "owned" : ""}`}>
          <div className="bundle-banner-glow" aria-hidden />
          <div className="bundle-banner-body">
            <div className="bundle-banner-icon">
              <Boxes size={20} />
            </div>
            <div className="bundle-banner-copy">
              <ModuleBrandLockup module="crypto" logoSize={28} compact badgeLabel="Monthly Bundle" />
              <div className="bundle-banner-meta">
                <span className="bundle-banner-price">$109<span>/mo</span></span>
                <span className="bundle-banner-sep">·</span>
                <span>All five modules · cancel anytime</span>
              </div>
            </div>
          </div>
          {ownsAll && !hasAnnual ? (
            <ModuleStatusBadge brand="trades" active />
          ) : hasAnnual ? (
            <ModuleStatusBadge brand="trades" active />
          ) : (
            <button
              className="btn btn-bundle-cta"
              type="button"
              onClick={() => subscribeModule("bundle")}
            >
              Get monthly bundle
            </button>
          )}
        </div>
      </div>

      <div className="pricing-simulator-row">
        <SavingsPlanner
          annualPrice={annualPrice}
          onUpgradeAnnual={hasAnnual ? undefined : subscribeAnnual}
        />
        <ImpactCalculator annualPrice={annualPrice} />
      </div>

      <div className="pricing-levers">
        <div className="pricing-lever">
          <ShieldAlert size={18} className="pricing-lever-icon" />
          <div>
            <strong>Loss aversion</strong>
            <p>{profile.fomo}</p>
          </div>
        </div>
        <div className="pricing-lever">
          <Wallet size={18} className="pricing-lever-icon" />
          <div>
            <strong>Value reframing</strong>
            <p>
              Annual All-Access is ${dailyAnnualCost(annualPrice)}/day — {profile.dailyCostFraming}.
            </p>
          </div>
        </div>
        <div className="pricing-lever">
          <Lock size={18} className="pricing-lever-icon" />
          <div>
            <strong>{profile.name} strategy</strong>
            <p>{profile.strategyCopy}</p>
          </div>
        </div>
      </div>

      <div className="module-grid module-grid-modules">
        {MODULES.map((m) => {
          const brand = APP_MODULE_TO_BRAND[m.id];
          const owned = hasModule(m.id);
          return (
            <div
              key={m.id}
              className={`module-card module-card-terminal ${owned ? "owned" : ""}`}
              data-brand={brand}
            >
              <ModuleBrandLockup module={brand} logoSize={28} compact />
              <div className="module-price module-price-terminal">
                ${m.price}<span>/mo</span>
              </div>
              <div className="module-desc module-desc-terminal">{m.desc}</div>
              {owned ? (
                <ModuleStatusBadge brand={brand} active />
              ) : (
                <button
                  className="btn btn-module-trial"
                  type="button"
                  data-brand={brand}
                  onClick={() => subscribeModule(m.id)}
                >
                  Start trial
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
