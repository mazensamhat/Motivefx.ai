"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star, Sparkles } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import {
  INTELLIGENCE_MARKETS,
  PRICING_TIERS,
  formatTierPrice,
  requiredMarketPicks,
  upgradeTiersFrom,
  type IntelligenceMarketId,
  type PricingTierId,
} from "@/lib/tiers";

function TierCard({
  tier,
  loading,
  onSelect,
}: {
  tier: (typeof PRICING_TIERS)[number];
  loading: PricingTierId | null;
  onSelect: (id: PricingTierId) => void;
}) {
  return (
    <article className={`pricing-tier-card ${tier.featured ? "featured" : ""}`}>
      {tier.featured && (
        <span className="pricing-preview-badge">
          <Star className="h-3 w-3" aria-hidden />
          Most popular
        </span>
      )}
      {tier.id === "elite" && (
        <span className="pricing-preview-badge elite">
          <Sparkles className="h-3 w-3" aria-hidden />
          VIP
        </span>
      )}
      <h2>{tier.name}</h2>
      <p className="pricing-preview-tagline">{tier.tagline}</p>
      <p className="pricing-tier-price">{formatTierPrice(tier)}</p>
      <p className="pricing-preview-markets mb-4">
        {tier.intelligenceMarketsIncluded === "all"
          ? "All 5 intelligence markets"
          : `Pick exactly ${tier.intelligenceMarketsIncluded} market${tier.intelligenceMarketsIncluded === 1 ? "" : "s"}`}
      </p>
      <ul className="pricing-tier-highlights mb-6">
        {tier.highlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
      <button
        type="button"
        className="pricing-tier-btn"
        disabled={loading !== null}
        onClick={() => onSelect(tier.id)}
      >
        {loading === tier.id ? "Redirecting…" : "Subscribe"}
      </button>
    </article>
  );
}

export default function PricingPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<PricingTierId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerTier, setPickerTier] = useState<PricingTierId | null>(null);
  const [selected, setSelected] = useState<IntelligenceMarketId[]>([]);
  const [currentTier, setCurrentTier] = useState<PricingTierId | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  /** Start false so first paint shows static PRICING_TIERS — never "Loading plans…". */
  const [planReady, setPlanReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{
          user?: {
            intelligenceTier?: string;
            hasSubscription?: boolean;
            email?: string;
          };
        }>;
      })
      .then((data) => {
        if (cancelled || !data?.user) return;
        const tier = data.user.intelligenceTier as PricingTierId | undefined;
        if (tier) setCurrentTier(tier);
        setHasSubscription(Boolean(data.user.hasSubscription));
        if (data.user.email) setEmail(data.user.email);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPlanReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleTiers = useMemo(() => {
    if (!planReady) return PRICING_TIERS;
    return upgradeTiersFrom(currentTier, { subscribed: hasSubscription });
  }, [planReady, hasSubscription, currentTier]);

  const isTopTier = planReady && hasSubscription && visibleTiers.length === 0;

  async function startCheckout(tierId: PricingTierId, markets: IntelligenceMarketId[]) {
    setError(null);
    setLoading(tierId);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierId, email, selectedMarkets: markets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) window.location.href = data.url;
      else throw new Error("No checkout URL returned");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(null);
    }
  }

  function onSelectTier(tierId: PricingTierId) {
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    const picks = requiredMarketPicks(tierId);
    if (picks === null) {
      void startCheckout(tierId, []);
      return;
    }
    setPickerTier(tierId);
    setSelected([]);
  }

  function toggleMarket(id: IntelligenceMarketId) {
    if (!pickerTier) return;
    const max = requiredMarketPicks(pickerTier)!;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);
      if (prev.length >= max) return prev;
      return [...prev, id];
    });
  }

  function confirmPicker() {
    if (!pickerTier) return;
    const max = requiredMarketPicks(pickerTier)!;
    if (selected.length !== max) {
      setError(`Pick exactly ${max} market(s).`);
      return;
    }
    setPickerTier(null);
    void startCheckout(pickerTier, selected);
  }

  return (
    <MarketingShell>
      <div className="pricing-page-header px-4">
        <p className="section-kicker">Intelligence plans</p>
        <h1 className="mt-2">{isTopTier ? "Your plan" : hasSubscription ? "Upgrade your plan" : "Choose your tier"}</h1>
        <p className="section-desc mx-auto mt-3 text-center">
          {isTopTier
            ? "You’re on Elite — the highest tier. Manage billing from account settings."
            : hasSubscription
              ? "Only higher tiers are shown. Lower plans are hidden while you’re subscribed."
              : "Capabilities unlock by tier — Lite picks one market, Pro picks two, Ultra and above get all five. Ultra+ adds API, teams, and multi-portfolio."}
        </p>
        {hasSubscription && currentTier && (
          <p className="mt-2 text-center text-sm text-slate-400">
            Current plan: <strong className="text-white">{currentTier.replace("_", " ").toUpperCase()}</strong>
          </p>
        )}
      </div>

      {isTopTier ? (
        <div className="px-4 text-center">
          <Link href="/app/settings" className="pricing-tier-btn inline-block">
            Manage billing
          </Link>
        </div>
      ) : (
        <>
          {!hasSubscription && (
            <div className="pricing-email-field px-4">
              <label htmlFor="checkout-email">Email for your account</label>
              <input
                id="checkout-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          )}

          {error && <p className="pricing-error px-4">{error}</p>}

          <div className="pricing-tier-grid">
            {visibleTiers.map((tier) => (
              <TierCard key={tier.id} tier={tier} loading={loading} onSelect={onSelectTier} />
            ))}
          </div>
        </>
      )}

      {pickerTier && (
        <div className="pricing-modal-overlay">
          <div className="pricing-modal">
            <h3>Pick your markets</h3>
            <p className="text-sm text-slate-400">
              Select exactly {requiredMarketPicks(pickerTier)} for {pickerTier.replace("_", " ")}.
            </p>
            <ul className="pricing-modal-list">
              {INTELLIGENCE_MARKETS.map((m) => (
                <li key={m.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selected.includes(m.id)}
                      onChange={() => toggleMarket(m.id)}
                    />
                    {m.label}
                  </label>
                </li>
              ))}
            </ul>
            <div className="pricing-modal-actions">
              <button type="button" className="pricing-modal-cancel" onClick={() => setPickerTier(null)}>
                Cancel
              </button>
              <button type="button" className="pricing-modal-confirm" onClick={confirmPicker}>
                Continue to checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </MarketingShell>
  );
}
