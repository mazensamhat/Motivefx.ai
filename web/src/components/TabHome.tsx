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
import { MotivFxLogo } from "./MotivFxLogo";
import { useSignalDetail } from "../hooks/useSignalDetail";
import { formatSignalStrength } from "../config/productCopy";
import { homeScoreDetail, sentimentDetail, confidenceDetail, scenarioDetail, resolveSignalDetail } from "../utils/signalIntel";

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
  { tab: "predictions", brand: "predictions", label: "Polymarket" },
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
  const { data, loading, error, refresh } = useHomeBriefing(60_000);
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

  const p = b.personalized;
  const delta = b.portfolioDelta;
  const deltaCls = delta == null ? "flat" : delta >= 0 ? "up" : "down";
  const deltaText =
    delta == null
      ? "Monitor-only overview"
      : `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}% today`;

  const snapshotRows = [
    { name: "MotiveFX Score", value: String(b.motivfxScore), pct: b.marketConfidence },
    { name: "Active signals", value: String(b.opportunityCount), pct: `${b.highRiskAlerts} high risk` },
    { name: "Radar hits", value: String(p?.radarSignalCount ?? 0), pct: p?.watchlistCount ? `${p.watchlistCount} watched` : "Watchlist" },
    { name: "Breaking news", value: String(b.breakingNewsCount), pct: "Feed pulse" },
  ];

  return (
    <>
      {glossaryOpen && <SignalGlossaryModal onClose={() => setGlossaryOpen(false)} />}
      {explain && (
        <AiExplainModal {...explain} onClose={() => setExplain(null)} />
      )}

      {sinceNewCount > 0 && hasFeature("since_you_were_away") && (
        <div className="home-since-banner">
          <strong>{sinceNewCount} new signal{sinceNewCount === 1 ? "" : "s"}</strong> since your last visit
        </div>
      )}

      <div className="home-mockup">
        <section className="home-overview-card">
          <div className="home-overview-top">
            <div>
              <div className="home-overview-label">Portfolio Overview</div>
              <div className="home-overview-value">{b.motivfxScore}</div>
              <div className={`mf-summary-delta ${deltaCls}`}>{deltaText}</div>
              <p className="mf-summary-sub">
                {b.greeting} · {b.tagline}
              </p>
              {user && p?.coverageLine && hasFeature("portfolio_intelligence") && (
                <p className="mf-summary-sub">{p.coverageLine}</p>
              )}
              {!user && (
                <p className="mf-summary-sub">Sign in to personalize your radar and ledger intel.</p>
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
                <span>Density <strong>{b.marketConfidence}</strong></span>
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

        <section className="home-snapshot-card">
          <h2 className="mf-section-title">Market Snapshot</h2>
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

        <section className="home-insight-card">
          <div className="home-insight-orb" aria-hidden>
            <Sparkles size={18} />
          </div>
          <div>
            <div className="home-insight-label">AI Market Insight</div>
            <p className="home-insight-body">
              {b.topAiTip || b.biggestOpportunity}
              {b.biggestRisk ? ` Risk lens: ${b.biggestRisk}.` : ""}
            </p>
          </div>
        </section>

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

        <section className="mf-section">
          <h2 className="mf-section-title">Recent Activity</h2>
          <div className="home-activity-list">
            {b.opportunities.slice(0, 4).map((o) => (
              <div key={o.id} className="home-activity-item">
                <div>
                  <div className="home-activity-title">{o.symbol} · {o.title}</div>
                  <div className="home-activity-meta">
                    {MODULE_BRAND[APP_MODULE_TO_BRAND[o.module] ?? "trades"]?.name ?? o.module}
                    {" · "}
                    {formatSignalStrength(o.confidence)}
                  </div>
                </div>
                <span className={`mf-pct-badge ${o.confidence >= 60 ? "up" : "flat"}`}>
                  {o.confidence}%
                </span>
              </div>
            ))}
            {b.opportunities.length === 0 && (
              <div className="empty" style={{ padding: "1rem" }}>No recent signals yet.</div>
            )}
          </div>
        </section>
      </div>

      <div className="home-desk-secondary">
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
          <h2><TrendingUp size={18} /> Today&apos;s Signals</h2>
          <span className="home-section-sub">Ranked by signal strength · informational only</span>
        </div>
        <div className="opportunity-grid">
          {b.opportunities.map((o) => (
            <article
              key={o.id}
              className="opportunity-card glass-card"
              data-brand={APP_MODULE_TO_BRAND[o.module] ?? "trades"}
            >
              <div className="opportunity-card-top">
                <Stars count={o.stars} />
                <RiskBadge
                  level={o.riskLevel}
                  label={`${RISK_LABEL[o.riskLevel] ?? o.riskLevel} risk`}
                  context={`${o.symbol} · ${o.title} · ${formatSignalStrength(o.confidence)}`}
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
              <div className="opportunity-title">{o.title}</div>
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
          ))}
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
