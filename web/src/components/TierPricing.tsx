import { Check, Sparkles, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  PRICING_FEATURE_MATRIX,
  PRICING_TIERS,
  formatTierPrice,
  requiredMarketPicks,
  upgradeTiersFrom,
  type PricingTierId,
} from "../config/pricingTiers";
import { useAuth } from "../hooks/useAuth";
import { useModules } from "../hooks/useModules";
import { getUserId } from "../lib/api";
import {
  isNativeIapAvailable,
  isNativeShell,
  requestNativeIapPurchase,
  requestNativeIapRestore,
} from "../lib/nativeShell";
import { MarketPickerModal } from "./MarketPickerModal";
import { BillingFinePrint } from "./BillingFinePrint";

function cellForTier(row: (typeof PRICING_FEATURE_MATRIX)[0], tierId: PricingTierId): string {
  const key =
    tierId === "ultra_plus" ? "ultraPlus" : tierId;
  const cell = row[key as keyof typeof row];
  if (cell === true) return "✓";
  if (cell === false) return "—";
  return String(cell);
}

export function TierPricing() {
  const { isAuthenticated, openAuth } = useAuth();
  const { tier: currentTier, plan, subscribeTier, loading } = useModules();
  const [picker, setPicker] = useState<{ tierId: PricingTierId; name: string; picks: number } | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [nativeIap, setNativeIap] = useState(false);
  const [iapError, setIapError] = useState<string | null>(null);

  const subscribed = Boolean(plan.hasAnnual || (plan.allowedMarkets?.length ?? 0) > 0);
  const visibleTiers = useMemo(
    () =>
      upgradeTiersFrom(currentTier, {
        subscribed: isAuthenticated && subscribed,
      }),
    [isAuthenticated, subscribed, currentTier]
  );

  const isTopTier = subscribed && visibleTiers.length === 0;

  const native = isNativeShell();

  useEffect(() => {
    setNativeIap(isNativeIapAvailable());
    function onIap(e: Event) {
      const detail = (e as CustomEvent).detail as { type?: string; ok?: boolean; error?: string };
      if (detail?.type !== "iap_result") return;
      setCheckoutBusy(false);
      if (!detail.ok) setIapError(detail.error ?? "Purchase did not complete.");
      else setIapError(null);
    }
    window.addEventListener("motivefx-iap", onIap as EventListener);
    return () => window.removeEventListener("motivefx-iap", onIap as EventListener);
  }, []);

  async function startCheckout(tierId: PricingTierId, selectedMarkets: string[] = []) {
    if (native && nativeIap) {
      setCheckoutBusy(true);
      setIapError(null);
      const ok = requestNativeIapPurchase(tierId, getUserId());
      if (!ok) {
        setCheckoutBusy(false);
        setIapError("Store billing is not available in this build.");
      }
      return;
    }
    if (native) {
      setIapError(
        "Store billing is not configured in this app build. Sign in with an account that already has a plan to access markets."
      );
      return;
    }
    if (!isAuthenticated) {
      openAuth("register");
      return;
    }
    setCheckoutBusy(true);
    try {
      await subscribeTier(tierId, selectedMarkets);
    } finally {
      setCheckoutBusy(false);
    }
  }

  function onSelectTier(tierId: PricingTierId) {
    if (native && !nativeIap) {
      setIapError(
        "Store billing is not configured in this app build. Sign in with an account that already has a plan to access markets."
      );
      return;
    }
    // Native IAP: skip market picker — server defaults markets by tier.
    if (native && nativeIap) {
      void startCheckout(tierId, []);
      return;
    }
    const picks = requiredMarketPicks(tierId);
    const t = PRICING_TIERS.find((x) => x.id === tierId)!;
    if (picks != null) {
      setPicker({ tierId, name: t.name, picks });
      return;
    }
    void startCheckout(tierId, []);
  }

  if (loading) return null;

  // Native shell without store billing: no web purchase CTAs (Play Payments / App Store 3.1.1).
  if (native && !nativeIap) {
    return (
      <div className="tier-pricing glass-panel pricing-terminal native-companion-billing" id="pricing">
        <div className="module-pricing-header">
          <h3 className="pricing-terminal-title">Subscriptions</h3>
          <p className="pricing-terminal-sub">
            New purchases are not offered in this app build. If your account already includes a MotiveFX
            plan, signed-in markets remain available. Store billing (Google Play / App Store) will be used
            for in-app purchases when configured.
          </p>
        </div>
        {iapError && <p className="auth-error">{iapError}</p>}
        <BillingFinePrint annualPrice={1299} className="tier-pricing-fine-print" compact />
      </div>
    );
  }

  if (isTopTier) {
    return (
      <div className="tier-pricing glass-panel pricing-terminal" id="pricing">
        <div className="module-pricing-header">
          <h3 className="pricing-terminal-title">Your plan</h3>
          <p className="tier-pricing-current">
            <strong>{currentTier.replace("_", " ").toUpperCase()}</strong>
            {" — "}you’re on the highest tier. Manage billing from Account.
          </p>
        </div>
        {native && nativeIap && (
          <button
            type="button"
            className="btn admin-btn"
            onClick={() => requestNativeIapRestore(getUserId())}
          >
            Restore purchases
          </button>
        )}
        <BillingFinePrint annualPrice={1299} className="tier-pricing-fine-print" compact />
      </div>
    );
  }

  return (
    <div className="tier-pricing glass-panel pricing-terminal" id="pricing">
      <div className="module-pricing-header">
        <h3 className="pricing-terminal-title">
          {subscribed ? "Upgrade your plan" : "Intelligence plans"}
        </h3>
        <p className="pricing-terminal-sub">
          {native && nativeIap
            ? "Purchase with in-app store billing. Web checkout is not available inside the app."
            : subscribed
              ? "Only higher tiers are shown — no downgrades here."
              : "Capabilities unlock by tier — Lite picks exactly one market, Pro picks two, Ultra and above get all five."}
        </p>
        {subscribed && (
          <p className="tier-pricing-current">
            Your plan: <strong>{currentTier.replace("_", " ").toUpperCase()}</strong>
          </p>
        )}
      </div>

      <div className="tier-pricing-grid">
        {visibleTiers.map((t) => {
          const isCurrent = t.id === currentTier;
          const price = formatTierPrice(t);
          return (
            <article
              key={t.id}
              className={`tier-pricing-card ${t.featured ? "featured" : ""} ${isCurrent ? "current" : ""}`}
            >
              {t.featured && (
                <span className="tier-pricing-badge">
                  <Star size={12} /> Most popular
                </span>
              )}
              {t.id === "elite" && (
                <span className="tier-pricing-badge elite">
                  <Sparkles size={12} /> VIP
                </span>
              )}
              <h4>{t.name}</h4>
              <p className="tier-pricing-tagline">{t.tagline}</p>
              <div className="tier-pricing-price">{price}</div>
              {t.targetMixPct && (
                <p className="tier-pricing-mix">Target mix {t.targetMixPct}</p>
              )}
              <ul className="tier-pricing-highlights">
                <li>
                  {t.intelligenceMarketsIncluded === "all"
                    ? "All 5 intelligence markets"
                    : `Pick exactly ${t.intelligenceMarketsIncluded} market${t.intelligenceMarketsIncluded === 1 ? "" : "s"}`}
                </li>
                {t.id === "lite" && <li>AI Brief · limited research briefs</li>}
                {t.id === "pro" && <li>Portfolio Intelligence · AI Memory · push + email</li>}
                {t.id === "ultra" && (
                  <>
                    <li>Voice briefing · Motive Daily voice</li>
                    <li>Decision History · advanced analytics</li>
                  </>
                )}
                {t.id === "ultra_plus" && (
                  <>
                    <li>Everything in Ultra</li>
                    <li>API access · multiple portfolios · team workspace</li>
                    <li>Beta features · concierge support</li>
                  </>
                )}
                {t.id === "elite" && <li>White-glove onboarding · early AI models · product feedback</li>}
              </ul>
              {isCurrent ? (
                <span className="tier-pricing-owned">
                  <Check size={14} /> Current plan
                </span>
              ) : (
                <button
                  type="button"
                  className={`btn ${t.featured ? "btn-accent-terminal" : "btn-module-trial"}`}
                  disabled={checkoutBusy}
                  onClick={() => onSelectTier(t.id)}
                >
                  {checkoutBusy
                    ? nativeIap
                      ? "Opening store…"
                      : "Loading…"
                    : native && nativeIap
                      ? "Subscribe in app"
                      : t.id === "elite"
                        ? "Get Elite"
                        : "Start free trial"}
                </button>
              )}
            </article>
          );
        })}
      </div>

      {iapError && <p className="auth-error">{iapError}</p>}

      {native && nativeIap && (
        <button
          type="button"
          className="btn admin-btn"
          onClick={() => requestNativeIapRestore(getUserId())}
        >
          Restore purchases
        </button>
      )}

      {!subscribed && !native && (
        <details className="tier-pricing-comparison">
          <summary>Full feature comparison</summary>
          <div className="tier-comparison-scroll">
            <table className="tier-comparison-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  {PRICING_TIERS.map((t) => (
                    <th key={t.id}>{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PRICING_FEATURE_MATRIX.map((row) => (
                  <tr key={row.feature}>
                    <td>{row.feature}</td>
                    {PRICING_TIERS.map((t) => (
                      <td key={t.id}>{cellForTier(row, t.id)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <BillingFinePrint annualPrice={1299} className="tier-pricing-fine-print" compact />

      {picker && (
        <MarketPickerModal
          tierName={picker.name}
          pickCount={picker.picks}
          onConfirm={(modules) => void startCheckout(picker.tierId, modules)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
