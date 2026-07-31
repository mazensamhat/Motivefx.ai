"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Factory,
  Flame,
  Globe2,
  HelpCircle,
  LayoutGrid,
  Rows3,
  Shield,
  ShoppingBag,
  Zap,
} from "lucide-react";
import {
  OPPORTUNITY_RADAR_DEMO,
  type OpportunityRadarBand,
  type OpportunityRadarCategory,
  type OpportunityRadarDemoCard,
  type OpportunityRadarStatusTone,
} from "@/lib/marketing-copy";

export type OpportunityRadarCardModel = {
  id: string;
  title: string;
  signalScore: number;
  confidence: number;
  horizon: string;
  description: string;
  drivers: readonly string[];
  beneficiaries: readonly string[];
  affectedAssets: readonly string[];
  status: string;
  statusTone: OpportunityRadarStatusTone;
  delta: number;
  sparkline: readonly number[];
  category: OpportunityRadarCategory;
  band: OpportunityRadarBand;
};

const CATEGORY_ICONS: Record<OpportunityRadarCategory, typeof Cpu> = {
  technology: Cpu,
  energy: Flame,
  defense: Shield,
  consumer: ShoppingBag,
  macro: Globe2,
  industrial: Factory,
};

const LEGEND: { band: OpportunityRadarBand; label: string }[] = [
  { band: "strong", label: "Strong" },
  { band: "moderate", label: "Moderate" },
  { band: "weakening", label: "Weakening" },
  { band: "high_risk", label: "High Risk" },
];

function bandFromScore(score: number, tone?: OpportunityRadarStatusTone): OpportunityRadarBand {
  if (tone === "risk" || score < 55) return "high_risk";
  if (tone === "weakening" || score < 70) return "weakening";
  if (score >= 80) return "strong";
  return "moderate";
}

export function demoToRadarCards(
  demo: readonly OpportunityRadarDemoCard[] = OPPORTUNITY_RADAR_DEMO
): OpportunityRadarCardModel[] {
  return demo.map((card, i) => ({
    id: `demo-${i}`,
    title: card.theme,
    signalScore: card.probability,
    confidence: card.confidence,
    horizon: card.horizon,
    description: card.description,
    drivers: card.evidence,
    beneficiaries: card.beneficiaries,
    affectedAssets: card.affectedAssets,
    status: card.status,
    statusTone: card.statusTone,
    delta: card.delta,
    sparkline: card.sparkline,
    category: card.category,
    band: card.band,
  }));
}

function SignalGauge({ score, band }: { score: number; band: OpportunityRadarBand }) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const r = 46;

  return (
    <div className={`or-gauge band-${band}`} aria-label={`Signal score ${pct}`}>
      <svg viewBox="0 0 112 68" aria-hidden>
        <path
          className="or-gauge-track"
          d={`M 10 58 A ${r} ${r} 0 0 1 102 58`}
          fill="none"
          pathLength={100}
        />
        <path
          className="or-gauge-value"
          d={`M 10 58 A ${r} ${r} 0 0 1 102 58`}
          fill="none"
          pathLength={100}
          strokeDasharray={`${pct} 100`}
        />
      </svg>
      <strong>{pct}</strong>
      <span className="or-gauge-caption">Signal</span>
    </div>
  );
}

function Sparkline({ values, tone }: { values: readonly number[]; tone: OpportunityRadarStatusTone }) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const w = 120;
  const h = 28;
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className={`or-spark tone-${tone}`} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={pts} fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function formatUpdatedAt(iso?: string) {
  if (!iso) return "Updated just now";
  try {
    const d = new Date(iso);
    return `Updated ${d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })}`;
  } catch {
    return "Updated just now";
  }
}

export function OpportunityRadarBoard({
  cards: cardsProp,
  updatedAt,
  ctaHref = "/demo",
  ctaLabel = "Explore Signal Graph™",
  showHowItWorks = true,
  compact = false,
}: {
  cards?: OpportunityRadarCardModel[];
  updatedAt?: string;
  ctaHref?: string;
  ctaLabel?: string;
  showHowItWorks?: boolean;
  compact?: boolean;
}) {
  const cards = cardsProp?.length ? cardsProp : demoToRadarCards();
  const trackRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"cards" | "list">("cards");
  const [howOpen, setHowOpen] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const stats = useMemo(() => {
    const total = cards.length;
    const strong = cards.filter((c) => c.signalScore >= 80).length;
    const avg = total
      ? Math.round(cards.reduce((s, c) => s + c.signalScore, 0) / total)
      : 0;
    const highest = total ? Math.max(...cards.map((c) => c.confidence)) : 0;
    const horizons = cards.map((c) => c.horizon);
    const horizon =
      horizons.sort(
        (a, b) => horizons.filter((h) => h === b).length - horizons.filter((h) => h === a).length
      )[0] ?? "—";
    return { total, strong, avg, highest, horizon };
  }, [cards]);

  function syncArrows() {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }

  useEffect(() => {
    syncArrows();
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => syncArrows();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", syncArrows);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", syncArrows);
    };
  }, [cards, view]);

  function scrollByCard(dir: -1 | 1) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".or-card");
    const amount = card ? card.offsetWidth + 16 : el.clientWidth * 0.85;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }

  return (
    <div className={`or-board${compact ? " is-compact" : ""}`}>
      <header className="or-header">
        <div className="or-header-copy">
          <p className="or-kicker">Institutional surface</p>
          <h2 className="or-title">Opportunity Radar™</h2>
          <p className="or-sub">
            Developing situations ranked by signal strength, drivers, beneficiaries, and horizon —
            not ticker hunting.
          </p>
        </div>
        <div className="or-header-actions">
          <div className="or-view-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={view === "cards" ? "active" : ""}
              aria-pressed={view === "cards"}
              onClick={() => setView("cards")}
            >
              <LayoutGrid size={18} aria-hidden />
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={view === "list" ? "active" : ""}
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <Rows3 size={18} aria-hidden />
              <span>List</span>
            </button>
          </div>
          <p className="or-updated">{formatUpdatedAt(updatedAt)}</p>
          {showHowItWorks && (
            <button
              type="button"
              className="or-how-btn"
              aria-expanded={howOpen}
              onClick={() => setHowOpen((v) => !v)}
            >
              <HelpCircle size={18} aria-hidden />
              How it Works
            </button>
          )}
        </div>
      </header>

      {howOpen && (
        <div className="or-how-panel" role="region" aria-label="How Opportunity Radar works">
          <p>
            Each card is a <strong>developing situation</strong> — not a trade ticket. Signal score
            blends probability and corroboration. Key drivers explain the move; beneficiaries and
            affected assets show who inherits the cascade. Informational only.
          </p>
        </div>
      )}

      <div className="or-stats" aria-label="Opportunity Radar summary">
        <div className="or-stat">
          <span>Total Opportunities</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="or-stat">
          <span>Strong Signals (80+)</span>
          <strong>{stats.strong}</strong>
        </div>
        <div className="or-stat">
          <span>Avg Signal Score</span>
          <strong>{stats.avg}</strong>
        </div>
        <div className="or-stat">
          <span>Highest Confidence</span>
          <strong>{stats.highest}%</strong>
        </div>
        <div className="or-stat or-stat-wide">
          <span>Time Horizon</span>
          <strong>{stats.horizon}</strong>
        </div>
        <ul className="or-legend" aria-label="Signal strength legend">
          {LEGEND.map((item) => (
            <li key={item.band} className={`band-${item.band}`}>
              <i aria-hidden />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      {view === "cards" ? (
        <div className="or-carousel-wrap">
          <button
            type="button"
            className="or-nav or-nav-prev"
            aria-label="Previous opportunities"
            disabled={!canPrev}
            onClick={() => scrollByCard(-1)}
          >
            <ChevronLeft size={22} aria-hidden />
          </button>
          <div className="or-carousel" ref={trackRef} tabIndex={0} aria-label="Opportunity cards">
            {cards.map((card, index) => {
              const Icon = CATEGORY_ICONS[card.category] ?? Zap;
              const band = card.band || bandFromScore(card.signalScore, card.statusTone);
              return (
                <article key={card.id} className={`or-card band-${band}`}>
                  <div className="or-card-top">
                    <div className="or-card-identity">
                      <span className="or-index">{String(index + 1).padStart(2, "0")}</span>
                      <span className="or-cat-icon" aria-hidden>
                        <Icon size={18} />
                      </span>
                      <h3>{card.title}</h3>
                    </div>
                    <SignalGauge score={card.signalScore} band={band} />
                  </div>

                  <div className={`or-status tone-${card.statusTone}`}>
                    <span>{card.status}</span>
                    <em>
                      {card.delta > 0 ? "+" : ""}
                      {card.delta} pts
                    </em>
                  </div>

                  <p className="or-desc">{card.description}</p>
                  <Sparkline values={card.sparkline} tone={card.statusTone} />

                  <div className="or-meta-grid">
                    <div>
                      <p className="or-meta-label">Key Drivers</p>
                      <ul>
                        {card.drivers.slice(0, 3).map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="or-meta-label">
                        {card.statusTone === "risk" || card.statusTone === "weakening"
                          ? "Top Affected"
                          : "Top Beneficiaries"}
                      </p>
                      <ul>
                        {(card.statusTone === "risk" || card.statusTone === "weakening"
                          ? card.affectedAssets
                          : card.beneficiaries
                        )
                          .slice(0, 3)
                          .map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                      </ul>
                    </div>
                  </div>

                  <footer className="or-card-foot">
                    <span>
                      Time Horizon <strong>{card.horizon}</strong>
                    </span>
                    <span>
                      Confidence <strong>{card.confidence}%</strong>
                    </span>
                  </footer>
                </article>
              );
            })}
          </div>
          <button
            type="button"
            className="or-nav or-nav-next"
            aria-label="Next opportunities"
            disabled={!canNext}
            onClick={() => scrollByCard(1)}
          >
            <ChevronRight size={22} aria-hidden />
          </button>
        </div>
      ) : (
        <ul className="or-list">
          {cards.map((card, index) => (
            <li key={card.id} className={`band-${card.band}`}>
              <span className="or-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{card.title}</strong>
                <p>{card.description}</p>
              </div>
              <span className="or-list-score">{card.signalScore}</span>
              <span className={`or-status tone-${card.statusTone}`}>{card.status}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="or-cta">
        <p>Want deeper insights?</p>
        <Link href={ctaHref} className="or-cta-btn">
          {ctaLabel}
          <ArrowRight size={18} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
