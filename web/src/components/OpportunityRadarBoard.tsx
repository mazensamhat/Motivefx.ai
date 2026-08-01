import { useEffect, useMemo, useRef, useState } from "react";
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
import type { HomeOpportunity, ProbabilityView } from "../types";

export type RadarBand = "strong" | "moderate" | "weakening" | "high_risk";
export type RadarStatusTone = "growing" | "stable" | "weakening" | "risk";
export type RadarCategory =
  | "technology"
  | "energy"
  | "defense"
  | "consumer"
  | "macro"
  | "industrial";

export type RadarCardModel = {
  id: string;
  title: string;
  signalScore: number;
  confidence: number;
  horizon: string;
  description: string;
  drivers: string[];
  beneficiaries: string[];
  affectedAssets: string[];
  status: string;
  statusTone: RadarStatusTone;
  delta: number;
  sparkline: number[];
  category: RadarCategory;
  band: RadarBand;
};

const CATEGORY_ICONS: Record<RadarCategory, typeof Cpu> = {
  technology: Cpu,
  energy: Flame,
  defense: Shield,
  consumer: ShoppingBag,
  macro: Globe2,
  industrial: Factory,
};

const LEGEND: { band: RadarBand; label: string }[] = [
  { band: "strong", label: "Strong" },
  { band: "moderate", label: "Moderate" },
  { band: "weakening", label: "Weakening" },
  { band: "high_risk", label: "High Risk" },
];

function inferCategory(title: string, module?: string): RadarCategory {
  const t = title.toLowerCase();
  if (t.includes("ai") || t.includes("semi") || t.includes("tech") || module === "crypto") return "technology";
  if (t.includes("energy") || t.includes("oil") || t.includes("gas") || t.includes("power")) return "energy";
  if (t.includes("defense") || t.includes("military")) return "defense";
  if (t.includes("consumer") || t.includes("retail")) return "consumer";
  if (t.includes("china") || t.includes("export") || t.includes("macro") || t.includes("freight")) return "macro";
  if (module === "penny") return "industrial";
  return module === "betting" || module === "predictions" ? "macro" : "industrial";
}

function statusFrom(score: number, delta: number, risk?: string): { status: string; tone: RadarStatusTone } {
  if (risk === "high" || risk === "extreme" || score < 55) {
    return { status: "HIGH RISK", tone: "risk" };
  }
  if (delta < -2 || score < 70) {
    return { status: "WEAKENING", tone: "weakening" };
  }
  if (delta >= 4 && score >= 80) {
    return { status: "GROWING FAST", tone: "growing" };
  }
  if (delta > 0 || score >= 75) {
    return { status: "STRENGTHENING", tone: "growing" };
  }
  return { status: "STABLE", tone: "stable" };
}

function bandFrom(score: number, tone: RadarStatusTone): RadarBand {
  if (tone === "risk" || score < 55) return "high_risk";
  if (tone === "weakening" || score < 70) return "weakening";
  if (score >= 80) return "strong";
  return "moderate";
}

function buildSparkline(score: number, delta: number): number[] {
  const end = Math.max(20, Math.min(98, Math.round(score)));
  const start = Math.max(20, Math.min(98, end - delta * 2));
  const steps = 6;
  return Array.from({ length: 7 }, (_, i) => {
    const t = i / steps;
    const base = start + (end - start) * t;
    const wobble = Math.sin(i * 1.3) * 1.5;
    return Math.round(Math.max(15, Math.min(99, base + wobble)));
  });
}

export function mapThemesToRadarCards(views: ProbabilityView[]): RadarCardModel[] {
  return views
    .filter((v) => v.id.startsWith("theme-"))
    .slice(0, 6)
    .map((v) => {
      const score = v.probability;
      const delta = Math.round(v.deltaVsPrior ?? (v.direction === "up" ? 3 : v.direction === "down" ? -3 : 0));
      const { status, tone } = statusFrom(score, delta);
      return {
        id: v.id,
        title: v.theme,
        signalScore: score,
        confidence: v.confidence,
        horizon: v.timing ?? "30–90 days",
        description:
          v.supportingFactors?.[0]?.replace(/^[^:]+:\s*/, "") ||
          `Theme probability ${score}% with model confidence ${v.confidence}%.`,
        drivers: (v.supportingFactors ?? []).slice(0, 3),
        beneficiaries: (v.beneficiaries ?? []).slice(0, 3),
        affectedAssets: (v.relatedSymbols ?? []).slice(0, 3),
        status,
        statusTone: tone,
        delta,
        sparkline: buildSparkline(score, delta),
        category: inferCategory(v.theme, v.module),
        band: bandFrom(score, tone),
      };
    });
}

export function mapOpportunitiesToRadarCards(opps: HomeOpportunity[]): RadarCardModel[] {
  return opps.slice(0, 8).map((o) => {
    const score = o.probability ?? o.confidence;
    const delta = Math.round(
      (o as HomeOpportunity & { deltaVsPrior?: number }).deltaVsPrior ??
        (o.direction === "up" ? 3 : o.direction === "down" ? -3 : 1)
    );
    const { status, tone } = statusFrom(score, delta, o.riskLevel);
    const title = o.symbol.length <= 24 ? `${o.symbol} · ${o.title}` : o.title;
    return {
      id: o.id,
      title,
      signalScore: score,
      confidence: o.modelConfidence ?? o.confidence,
      horizon: "Near-term desk window",
      description: o.reasons?.[0] ?? `${o.symbol} signal at ${score}% strength.`,
      drivers: (o.reasons ?? o.signals ?? []).slice(0, 3),
      beneficiaries: (o.beneficiaries ?? o.signals ?? []).slice(0, 3),
      affectedAssets: [o.symbol, ...(o.genomeThemes ?? [])].slice(0, 3),
      status,
      statusTone: tone,
      delta,
      sparkline: buildSparkline(score, delta),
      category: inferCategory(o.title, o.module),
      band: bandFrom(score, tone),
    };
  });
}

function SignalGauge({ score, band }: { score: number; band: RadarBand }) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const r = 42;
  return (
    <div className={`or-gauge band-${band}`} aria-label={`Signal score ${pct}`}>
      <svg viewBox="0 0 112 68" aria-hidden>
        <path className="or-gauge-track" d={`M 10 58 A ${r} ${r} 0 0 1 102 58`} fill="none" pathLength={100} />
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

function Sparkline({ values, tone }: { values: number[]; tone: RadarStatusTone }) {
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

interface Props {
  cards: RadarCardModel[];
  updatedAt?: string;
  onExploreGraph?: () => void;
  /** Open theme intel / scorecard for a radar card */
  onCardClick?: (card: RadarCardModel) => void;
  compact?: boolean;
  title?: string;
  subtitle?: string;
  sectionId?: string;
}

export function OpportunityRadarBoard({
  cards,
  updatedAt,
  onExploreGraph,
  onCardClick,
  compact = false,
  title = "Opportunity Radar™",
  subtitle = "Developing situations · ranked by signal strength · informational only",
  sectionId = "opportunity-radar",
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"cards" | "list">("cards");
  const [howOpen, setHowOpen] = useState(false);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const stats = useMemo(() => {
    const total = cards.length;
    const strong = cards.filter((c) => c.signalScore >= 80).length;
    const avg = total ? Math.round(cards.reduce((s, c) => s + c.signalScore, 0) / total) : 0;
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

  const updatedLabel = (() => {
    if (!updatedAt) return "Updated just now";
    try {
      return `Updated ${new Date(updatedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}`;
    } catch {
      return "Updated just now";
    }
  })();

  if (!cards.length) {
    return (
      <section className={`or-board terminal-or${compact ? " is-compact" : ""}`} id={sectionId}>
        <h2 className="or-title">{title}</h2>
        <p className="or-sub">No radar hits yet.</p>
      </section>
    );
  }

  return (
    <section className={`or-board terminal-or${compact ? " is-compact" : ""}`} id={sectionId}>
      <header className="or-header">
        <div className="or-header-copy">
          <p className="or-kicker">Daily Brief</p>
          <h2 className="or-title">{title}</h2>
          <p className="or-sub">{subtitle}</p>
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
          <p className="or-updated">{updatedLabel}</p>
          <button
            type="button"
            className="or-how-btn"
            aria-expanded={howOpen}
            onClick={() => setHowOpen((v) => !v)}
          >
            <HelpCircle size={18} aria-hidden />
            How it Works
          </button>
        </div>
      </header>

      {howOpen && (
        <div className="or-how-panel" role="region" aria-label="How Opportunity Radar works">
          <p>
            Each card is a developing situation ranked by signal strength. Drivers show corroboration;
            beneficiaries and affected assets show cascade exposure. Educational context only — not advice.
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
              const interactive = Boolean(onCardClick);
              return (
                <article
                  key={card.id}
                  className={`or-card band-${card.band}${interactive ? " is-clickable" : ""}`}
                >
                  <button
                    type="button"
                    className="or-card-hit"
                    onClick={() => onCardClick?.(card)}
                    disabled={!interactive}
                    aria-label={`Open ${card.title} intel`}
                  >
                    <div className="or-card-top">
                      <div className="or-card-identity">
                        <span className="or-index">{String(index + 1).padStart(2, "0")}</span>
                        <span className="or-cat-icon" aria-hidden>
                          <Icon size={18} />
                        </span>
                        <h3>{card.title}</h3>
                      </div>
                      <SignalGauge score={card.signalScore} band={card.band} />
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
                      {interactive && <span className="or-card-tap">Tap for related watches →</span>}
                    </footer>
                  </button>
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
            <li key={card.id} className={`band-${card.band}${onCardClick ? " is-clickable" : ""}`}>
              <button
                type="button"
                className="or-list-hit"
                onClick={() => onCardClick?.(card)}
                disabled={!onCardClick}
                aria-label={`Open ${card.title} intel`}
              >
                <span className="or-index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{card.title}</strong>
                  <p>{card.description}</p>
                </div>
                <span className="or-list-score">{card.signalScore}</span>
                <span className={`or-status tone-${card.statusTone}`}>{card.status}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {onExploreGraph && (
        <div className="or-cta">
          <p>Want deeper insights?</p>
          <button type="button" className="or-cta-btn" onClick={onExploreGraph}>
            Explore Signal Graph™
            <ArrowRight size={18} aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}
