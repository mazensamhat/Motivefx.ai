"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRICING_TIERS, formatTierPrice } from "@/lib/tiers";

const MODULE_DOTS = ["📈", "₿", "🎯", "🏈", "📊"];

export function PricingPreview() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="section-pad pricing-section">
      <div className="mx-auto max-w-6xl px-4">
        <div className="section-header text-center mx-auto max-w-2xl">
          <p className="section-kicker">Pricing</p>
          <h2 className="section-title">Flexible Plans. One Powerful Platform.</h2>
          <div className="pricing-toggle">
            <button type="button" className={!annual ? "active" : ""} onClick={() => setAnnual(false)}>
              Monthly
            </button>
            <button type="button" className={annual ? "active" : ""} onClick={() => setAnnual(true)}>
              Annual <span className="save-pill">Save up to 20%</span>
            </button>
          </div>
        </div>

        <div className="pricing-preview-grid landing-pricing">
          {PRICING_TIERS.map((tier) => (
            <article
              key={tier.id}
              className={`pricing-preview-card ${tier.featured ? "featured" : ""} ${tier.id === "elite" ? "elite-card" : ""}`}
            >
              {tier.featured && (
                <span className="pricing-preview-badge">
                  <Star className="h-3 w-3" aria-hidden />
                  Most popular
                </span>
              )}
              {tier.id === "elite" && (
                <span className="pricing-preview-badge elite">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Best value
                </span>
              )}
              <h3>{tier.name}</h3>
              <p className="pricing-preview-tagline">{tier.tagline}</p>
              <p className="pricing-preview-price">{formatTierPrice(tier)}</p>
              <p className="pricing-preview-markets">
                {tier.intelligenceMarketsIncluded === "all"
                  ? "All 5 modules"
                  : `Choose ${tier.intelligenceMarketsIncluded} module${tier.intelligenceMarketsIncluded === 1 ? "" : "s"}`}
              </p>
              <span className="module-dots" aria-hidden>
                {MODULE_DOTS.slice(0, tier.intelligenceMarketsIncluded === "all" ? 5 : Number(tier.intelligenceMarketsIncluded)).join(" ")}
              </span>
              <Link
                href="/pricing"
                className={`pricing-card-cta ${tier.id === "elite" ? "elite-cta" : ""}`}
              >
                {tier.id === "elite" ? "Join Elite" : "Get started"}
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button href="/pricing" variant="green" size="lg">
            Compare all plans
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </section>
  );
}
