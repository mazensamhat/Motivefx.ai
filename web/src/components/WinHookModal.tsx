import { BarChart3, Boxes, Coins, Sparkles, TrendingUp, Trophy, X, Zap } from "lucide-react";
import type { WinStory } from "../hooks/useModules";
import { MODULE_BRAND } from "../brand/moduleBrand";
import {
  hookForModule,
  savingsPercent,
  MODULE_PRICE,
} from "../config/subscriptionHooks";
import { BillingFinePrint } from "./BillingFinePrint";
import { useGenerationalProfile } from "../hooks/useGenerationalProfile";

const MODULE_ICONS: Record<string, typeof BarChart3> = {
  trades: BarChart3,
  penny: TrendingUp,
  crypto: Coins,
  betting: Trophy,
  predictions: Sparkles,
  bundle: Boxes,
};

interface Props {
  story: WinStory;
  subscribedModule: string;
  annualPrice: number;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export function WinHookModal({ story, subscribedModule, annualPrice, onUpgrade, onDismiss }: Props) {
  const hook = hookForModule(subscribedModule);
  const { profile } = useGenerationalProfile();
  const brand = MODULE_BRAND[hook.brand];
  const Icon = MODULE_ICONS[hook.key] ?? Zap;
  const accent = profile.accent;

  const monthlyYearly = MODULE_PRICE * 12;
  const pctVsSingle = savingsPercent(monthlyYearly * 5, annualPrice);
  const pctVsBundle = savingsPercent(109 * 12, annualPrice);

  return (
    <div className="win-hook-overlay" onClick={onDismiss}>
      <div
        className="win-hook-modal win-hook-modal-v2 glass-panel"
        style={{
          borderTopColor: accent,
          borderTopWidth: 4,
          boxShadow: `0 20px 50px -12px ${profile.glow}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="win-hook-close" type="button" onClick={onDismiss} aria-label="Dismiss">
          <X size={20} />
        </button>

        <header className="win-hook-hook-header">
          <div className="win-hook-hook-icon" style={{ color: brand.accent, backgroundColor: `${brand.accent}15` }}>
            <Icon size={20} />
          </div>
          <div>
            <h2 className="win-hook-hook-title">Priority {hook.title} Upgrade</h2>
            <span className="win-hook-hook-badge" style={{ color: accent }}>{profile.name.toUpperCase()} · {hook.badge}</span>
          </div>
        </header>

        <div className="win-hook-live">
          <span className="win-hook-pulse" style={{ background: brand.accent }} />
          LIVE SIGNAL · {story.timeAgo}
        </div>

        <div className="win-hook-amount win-hook-signal-title" style={{ color: brand.accent, textShadow: `0 0 30px ${brand.glow}` }}>
          {story.signal ?? story.detail}
        </div>
        <p className="win-hook-headline">
          MotiveFX flagged <strong>{story.signal ?? story.detail}</strong> for a member in{" "}
          <strong>{story.city}</strong>
          {story.detail && story.signal ? <> — {story.detail}</> : null}.
        </p>
        <p className="win-hook-signal-note">Illustrative signal story — not a guarantee of outcomes.</p>

        <div className="win-hook-teaser">
          <span className="win-hook-teaser-badge">{hook.teaserBadge}</span>
          <p className="win-hook-teaser-headline">{profile.tagline}</p>
          <p className="win-hook-teaser-body">{profile.fomo}</p>
          <p className="win-hook-teaser-advantage" style={{ borderLeftColor: accent }}>
            <strong>Module hook:</strong> {hook.hookHeader} {hook.description}
          </p>
        </div>

        <div className="win-hook-compare">
          <div className="win-hook-compare-col">
            <span className="win-hook-compare-label">Monthly tier</span>
            <p className="win-hook-compare-price">
              ${MODULE_PRICE}<span>/mo</span>
            </p>
            <p className="win-hook-compare-note">{hook.monthlyLimitations}</p>
          </div>
          <div className="win-hook-compare-col win-hook-compare-best" style={{ borderColor: `${accent}40` }}>
            <span className="win-hook-compare-label best" style={{ color: accent }}>
              {profile.ctaHeader}
            </span>
            <p className="win-hook-compare-price">
              ${annualPrice}<span>/yr</span>
            </p>
            <p className="win-hook-compare-note accent" style={{ color: accent }}>
              {profile.ctaPriceFrame} · {profile.priceFraming}
            </p>
          </div>
        </div>

        <div className="win-hook-lever">
          <span className="win-hook-lever-tag">{profile.strategyFocus}</span>
          <span className="win-hook-lever-stat">
            Save up to {Math.max(pctVsBundle, pctVsSingle)}% vs monthly stack
          </span>
        </div>

        <button
          type="button"
          className="btn btn-annual-cta win-hook-cta-v2"
          style={{ backgroundColor: accent, color: profile.id === "boomer" ? "#fff" : "#000" }}
          onClick={onUpgrade}
        >
          <Zap size={14} />
          {profile.upgradeButtonText}
        </button>

        <button type="button" className="btn win-hook-skip-v2" onClick={onDismiss}>
          {profile.dismissButtonText}
        </button>

        <BillingFinePrint annualPrice={annualPrice} className="win-hook-legal" />
      </div>
    </div>
  );
}
