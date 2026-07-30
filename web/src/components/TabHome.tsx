import { ArrowRight, BookOpen, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useHomeBriefing } from "../hooks/useHomeBriefing";
import { useAuth } from "../hooks/useAuth";
import { useGenerationalProfile } from "../hooks/useGenerationalProfile";
import { useModules } from "../hooks/useModules";
import type { TabId } from "../types";
import { AiExplainModal, Stars } from "./AiExplainModal";
import { AudioBriefingButton } from "./AudioBriefingButton";
import { CompareLensSection } from "./CompareLensSection";
import { FeatureGate } from "./FeatureGate";
import { HomeAlertsSection } from "./HomeAlertsSection";
import { IntelJournalPanel } from "./IntelJournalPanel";
import { RiskBadge } from "./RiskBadge";
import { SignalChip } from "./SignalChip";
import { SignalGlossaryModal } from "./SignalGlossaryModal";
import { WatchlistRadar } from "./WatchlistRadar";
import { APP_MODULE_TO_BRAND, MODULE_BRAND } from "../brand/moduleBrand";
import { Phase2IntelPanels } from "./Phase2IntelPanels";
import { InstitutionalPanel } from "./InstitutionalPanel";
import { MotivFxLogo } from "./MotivFxLogo";
import { useSignalDetail } from "../hooks/useSignalDetail";
import { formatSignalStrength } from "../config/productCopy";
import { homeScoreDetail, sentimentDetail, confidenceDetail, scenarioDetail, resolveSignalDetail } from "../utils/signalIntel";
import { resolveMotiveRating, stanceLabel } from "../utils/motiveRating";

const RISK_LABEL: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  extreme: "Extreme",
};

const LAST_OPPS_KEY = "motivefx_last_opps";

const MODULE_TILES: { tab: TabId; brand: keyof typeof MODULE_BRAND; label: string }[] = [
  { tab: "stocks", brand: "trades", label: "Trades" },
  { tab: "penny", brand: "pinkslips", label: "Pink Slip" },
  { tab: "crypto", brand: "crypto", label: "Crypto" },
  { tab: "betting", brand: "betting", label: "Bets" },
  { tab: "predictions", brand: "predictions", label: "Predictions" },
];

interface Props {
  onNavigate: (tab: TabId) => void;
  onOpenGlossary?: () => void;
}

export function TabHome({ onNavigate, onOpenGlossary }: Props) {
  const { user } = useAuth();
  const { hasFeature } = useModules();
  const { profile } = useGenerationalProfile();
  const { inspectDetail } = useSignalDetail();
  const { data, loading, error, refreshing, refresh } = useHomeBriefing(60_000);
  const [sinceNewCount, setSinceNewCount] = useState(0);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [explain, setExplain] = useState<{
    title: string;
    symbol?: string;
    confidence: number;
    reasons: string[];
    signals?: string[];
    module?: string;
  } | null>(null);

  const b = data;

  useEffect(() => {
    if (!b?.generatedAt) return;
    window.dispatchEvent(new Event("motivefx:alerts-refresh"));
  }, [b?.generatedAt, b?.alertUnreadCount]);

  useEffect(() => {
    if (!b?.opportunities?.length) return;
    try {
      const prev: string[] = JSON.parse(localStorage.getItem(LAST_OPPS_KEY) || "[]");
      const newCount = b.opportunities.filter((o) => !prev.includes(o.id)).length;
      setSinceNewCount(newCount);
      localStorage.setItem(LAST_OPPS_KEY, JSON.stringify(b.opportunities.map((o) => o.id)));
    } catch {
      setSinceNewCount(0);
    }
  }, [b?.opportunities, b?.generatedAt]);

  if (loading && !b) {
    return <div className="loading home-loading">{profile.intelLoadingMessage}</div>;
  }

  if (!b) {
    return (
      <div className="empty">
        Unable to load briefing.{error ? ` ${error}` : ""}{" "}
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => void refresh()}>
          Retry
        </button>
      </div>
    );
  }

  const showWarmup = Boolean(refreshing || error || (b as { degraded?: boolean }).degraded);

  const p = b.personalized;
  const delta = b.portfolioDelta;
  const deltaCls = delta == null ? "flat" : delta >= 0 ? "up" : "down";
  const deltaText =
    delta == null
      ? "Monitor-only overview"
      : `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}% today`;

  const snapshotRows = [
    { name: "Market confidence", value: String(b.marketConfidence), pct: `Score ${b.motivfxScore}` },
    { name: "Opportunity Radar", value: String(b.opportunityCount), pct: `${b.highRiskAlerts} high risk` },
    { name: "Watchlist hits", value: String(p?.radarSignalCount ?? 0), pct: p?.watchlistCount ? `${p.watchlistCount} watched` : "Watchlist" },
    { name: "Breaking news", value: String(b.breakingNewsCount), pct: "Feed pulse" },
  ];

  const topRadar = b.opportunities.slice(0, 3);

  return (
    <>
      {glossaryOpen && <SignalGlossaryModal onClose={() => setGlossaryOpen(false)} />}
      {explain && (
        <AiExplainModal {...explain} onClose={() => setExplain(null)} />
      )}

      {sinceNewCount > 0 && hasFeature("since_you_were_away") && (
        <div className="home-since-banner">
          <strong>{sinceNewCount} new opportunit{sinceNewCount === 1 ? "y" : "ies"}</strong> on Opportunity Radar since your last visit
        </div>
      )}

      {showWarmup && (
        <div className="home-since-banner" role="status">
          {refreshing
            ? "Refreshing Daily Brief…"
            : error
              ? "Live feeds are catching up — showing the last Daily Brief."
              : "Partial Daily Brief while desks warm up."}{" "}
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      )}

      <div className="home-mockup">
        <section className="home-overview-card">
          <div className="home-overview-top">
            <div>
              <div className="home-overview-label">Daily Brief</div>
              <div className="home-overview-value">{b.motivfxScore}</div>
              <div className={`mf-summary-delta ${deltaCls}`}>{deltaText}</div>
              <p className="mf-summary-sub">
                {b.greeting} · {b.tagline}
              </p>
              <p className="mf-summary-sub">
                Confidence <strong>{b.marketConfidence}</strong>
                {b.biggestOpportunity ? ` · Top opportunity: ${b.biggestOpportunity}` : ""}
                {b.biggestRisk ? ` · Watch: ${b.biggestRisk}` : ""}
              </p>
              {user && p?.coverageLine && hasFeature("portfolio_intelligence") && (
                <p className="mf-summary-sub">{p.coverageLine}</p>
              )}
              {!user && (
                <p className="mf-summary-sub">Sign in to personalize Opportunity Radar and ledger intel.</p>
              )}
            </div>
            <button
              type="button"
              className="home-score-block home-score-clickable"
              onClick={() => inspectDetail(homeScoreDetail(b.motivfxScore, b.marketConfidence, b.stars))}
              title="Learn about MotiveFX Score"
            >
              <Stars count={b.stars} />
              <div className="home-score-meta">
                <span>Confidence <strong>{b.marketConfidence}</strong></span>
              </div>
            </button>
          </div>
          <div className="home-hero-actions" style={{ marginTop: "0.85rem" }}>
            {b.audioBriefingScript && hasFeature("voice_briefing") && (
              <AudioBriefingButton script={b.audioBriefingScript} />
            )}
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setGlossaryOpen(true);
                onOpenGlossary?.();
              }}
            >
              <BookOpen size={14} /> Glossary
            </button>
          </div>
        </section>

        <section className="home-insight-card">
          <div className="home-insight-orb" aria-hidden>
            <Sparkles size={18} />
          </div>
          <div>
            <div className="home-insight-label">What changed · Why it matters · What to watch</div>
            <p className="home-insight-body">
              {b.topAiTip || b.biggestOpportunity}
              {b.biggestRisk ? ` Risk lens: ${b.biggestRisk}.` : ""}
            </p>
          </div>
        </section>

        <section className="home-snapshot-card">
          <h2 className="mf-section-title">Morning snapshot</h2>
          {snapshotRows.map((row) => (
            <div key={row.name} className="home-snapshot-row">
              <span className="home-snapshot-name">{row.name}</span>
              <span className="home-snapshot-meta">
                <strong style={{ color: "var(--text)", marginRight: "0.5rem" }}>{row.value}</strong>
                {row.pct}
              </span>
            </div>
          ))}
        </section>

        <section className="mf-section">
          <h2 className="mf-section-title">Opportunity Radar</h2>
          <p className="mf-summary-sub" style={{ marginBottom: "0.75rem" }}>
            Top developing situations · ranked by signal strength · informational only
          </p>
          <div className="home-activity-list">
            {topRadar.map((o) => {
              const rating = resolveMotiveRating(
                o.stance ?? o.title,
                o.confidence,
                o.module === "betting" ? "betting" : o.module === "predictions" ? "predictions" : "markets"
              );
              return (
              <div key={o.id} className="home-activity-item">
                <div>
                  <div className="home-activity-title">{o.symbol} · {stanceLabel(o.stance ?? o.title)}</div>
                  <div className="home-activity-meta">
                    {MODULE_BRAND[APP_MODULE_TO_BRAND[o.module] ?? "trades"]?.name ?? o.module}
                    {" · "}
                    {formatSignalStrength(o.confidence)}
                    {" · "}
                    <span className={`terminal-tag terminal-tag-${rating.variant}`}>{rating.shortLabel}</span>
                  </div>
                </div>
                <span className={`mf-pct-badge ${o.confidence >= 60 ? "up" : "flat"}`}>
                  {o.confidence}%
                </span>
              </div>
              );
            })}
            {topRadar.length === 0 && (
              <div className="empty" style={{ padding: "1rem" }}>No radar hits yet.</div>
            )}
          </div>
        </section>
      </div>

      <Phase2IntelPanels briefing={b} onPrefsChanged={() => void refresh()} />

      <InstitutionalPanel />

      <div className="home-desk-secondary">
      <section className="mf-section">
        <h2 className="mf-section-title">My Modules</h2>
        <div className="home-module-grid">
          {MODULE_TILES.map((tile) => {
            const summary = b.moduleSummaries.find((m) => m.tab === tile.tab || APP_MODULE_TO_BRAND[m.module] === tile.brand);
            const accent = MODULE_BRAND[tile.brand].accent;
            return (
              <button
                key={tile.tab}
                type="button"
                className="home-module-tile"
                style={{ ["--tile-accent" as string]: accent }}
                data-brand={tile.brand}
                onClick={() => onNavigate(tile.tab)}
              >
                <MotivFxLogo module={tile.brand} size={28} />
                <span className="home-module-tile-label">{tile.label}</span>
                <span className="home-module-tile-sub">
                  {summary
                    ? `${summary.count} tracked${summary.newSignals ? ` · ${summary.newSignals} new` : ""}`
                    : "Open desk"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <WatchlistRadar
        personalized={p}
        onNavigateModule={(tab) => onNavigate(tab as TabId)}
      />

      <FeatureGate feature="decision_history">
        <IntelJournalPanel />
      </FeatureGate>

      <FeatureGate feature="push_notifications">
        <HomeAlertsSection />
      </FeatureGate>

      {b.compareLens && b.compareLens.length > 0 && (
        <CompareLensSection items={b.compareLens} />
      )}

      <section className="home-section">
        <div className="home-section-header">
          <h2><TrendingUp size={18} /> Opportunity Radar</h2>
          <span className="home-section-sub">All ranked opportunities · informational only</span>
        </div>
        <div className="opportunity-grid">
          {b.opportunities.map((o) => {
            const rating = resolveMotiveRating(
              o.stance ?? o.title,
              o.confidence,
              o.module === "betting" ? "betting" : o.module === "predictions" ? "predictions" : "markets"
            );
            return (
            <article
              key={o.id}
              className="opportunity-card glass-card"
              data-brand={APP_MODULE_TO_BRAND[o.module] ?? "trades"}
            >
              <div className="opportunity-card-top">
                <Stars count={o.stars} />
                <span className={`terminal-tag terminal-tag-${rating.variant}`}>{rating.shortLabel}</span>
                <RiskBadge
                  level={o.riskLevel}
                  label={`${RISK_LABEL[o.riskLevel] ?? o.riskLevel} risk`}
                  context={`${o.symbol} · ${rating.label} · ${formatSignalStrength(o.confidence)}`}
                />
              </div>
              <button
                type="button"
                className="opportunity-symbol opportunity-metric-clickable"
                onClick={() =>
                  inspectDetail(
                    resolveSignalDetail(o.title, {
                      symbol: o.symbol,
                      confidence: o.confidence,
                      contextLines: o.reasons.slice(0, 2),
                      journalNote: `${o.symbol}: ${o.title}`,
                      journalMeta: { module: o.module, symbol: o.symbol, signalTitle: o.title },
                    })
                  )
                }
                title="Signal overview"
              >
                {o.symbol}
              </button>
              <div className="opportunity-title">{stanceLabel(o.stance ?? o.title)}</div>
              <div className="opportunity-metrics">
                <button
                  type="button"
                  className="opportunity-metric-btn"
                  onClick={() => inspectDetail(confidenceDetail(o.symbol, o.confidence, o.title))}
                  title="What is signal strength?"
                >
                  <span className="metric-label">Signal strength</span>
                  <span className="metric-value">{o.confidence}%</span>
                </button>
                {o.probability != null && (
                  <button
                    type="button"
                    className="opportunity-metric-btn"
                    onClick={() =>
                      inspectDetail({
                        title: `Probability · ${o.symbol}`,
                        category: "Probability Engine",
                        definition: `Probability Engine estimates ${o.probability}% likelihood under current signals (model confidence ${o.modelConfidence ?? o.confidence}%). Educational context only — not a forecast.`,
                        symbol: o.symbol,
                        confidence: o.probability,
                      })
                    }
                    title="Probability Engine"
                  >
                    <span className="metric-label">Probability</span>
                    <span className="metric-value">{o.probability}%</span>
                  </button>
                )}
                <button
                  type="button"
                  className="opportunity-metric-btn"
                  onClick={() => inspectDetail(scenarioDetail(o.symbol, o.expectedMove, o.title))}
                  title="What is scenario?"
                >
                  <span className="metric-label">Scenario*</span>
                  <span className="metric-value">{o.expectedMove}</span>
                </button>
              </div>
              <div className="opportunity-signals">
                {o.signals.map((s) => (
                  <SignalChip
                    key={s}
                    label={s}
                    detail={{ symbol: o.symbol, confidence: o.confidence }}
                  />
                ))}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-why"
                onClick={() =>
                  setExplain({
                    title: o.title,
                    symbol: o.symbol.length <= 8 ? o.symbol : undefined,
                    confidence: o.confidence,
                    reasons: o.reasons,
                    signals: o.signals,
                    module: o.module,
                  })
                }
              >
                Why?
              </button>
            </article>
            );
          })}
        </div>
        {b.scenarioDisclaimer && (
          <p className="home-scenario-footnote">{b.scenarioDisclaimer}</p>
        )}
      </section>

      <section className="home-section">
        <h2 className="home-section-header solo">Module pulse</h2>
        <div className="module-pulse-grid">
          {b.moduleSummaries.map((m) => {
            const topOpp = b.opportunities.find((o) => o.module === m.module);
            return (
            <article
              key={m.module}
              className="module-pulse-card glass-card"
              data-brand={APP_MODULE_TO_BRAND[m.module]}
            >
              <button
                type="button"
                className="module-pulse-main"
                onClick={() => {
                  if (topOpp) {
                    inspectDetail(
                      resolveSignalDetail(topOpp.title, {
                        symbol: topOpp.symbol,
                        confidence: topOpp.confidence,
                        contextLines: topOpp.reasons.slice(0, 3),
                        journalMeta: { module: topOpp.module, symbol: topOpp.symbol, signalTitle: topOpp.title },
                      })
                    );
                  } else {
                    onNavigate(m.tab as TabId);
                  }
                }}
                title={topOpp ? `Top signal: ${topOpp.symbol}` : `Open ${m.label} desk`}
              >
                <span className="module-pulse-label">{m.label}</span>
                <span className="module-pulse-count">{m.count}</span>
                <span className="module-pulse-sub">
                  {m.count === 0
                    ? "No positions yet"
                    : `${m.count} ${m.count === 1 ? "position" : "positions"} in ledger`}
                </span>
                {(m.newSignals ?? 0) > 0 && (
                  <span className="module-pulse-new">
                    {m.newSignals} live match{m.newSignals === 1 ? "" : "es"}
                  </span>
                )}
              </button>
              <button
                type="button"
                className="module-pulse-desk-link"
                onClick={() => onNavigate(m.tab as TabId)}
              >
                View desk <ArrowRight size={12} />
              </button>
            </article>
            );
          })}
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-section-header solo">Community sentiment</h2>
        <div className="sentiment-row">
          <SentimentCard label="Reddit" value={b.sentiment.reddit} />
          <SentimentCard label="X / Twitter" value={b.sentiment.x} />
          <SentimentCard label="News flow" value={b.sentiment.news} />
        </div>
      </section>
      </div>
    </>
  );
}

function SentimentCard({ label, value }: { label: string; value: string }) {
  const { inspectDetail } = useSignalDetail();
  const cls = value === "bullish" ? "bullish" : value === "bearish" ? "bearish" : "neutral";
  return (
    <button
      type="button"
      className={`sentiment-card sentiment-card-clickable ${cls}`}
      onClick={() => inspectDetail(sentimentDetail(label, value))}
      title={`Learn about ${label} sentiment`}
    >
      <span className="sentiment-label">{label}</span>
      <span className="sentiment-value">{value}</span>
    </button>
  );
}
