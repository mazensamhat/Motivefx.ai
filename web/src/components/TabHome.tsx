import { ArrowRight, BookOpen, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import {
  mapOpportunitiesToRadarCards,
  mapThemesToRadarCards,
  OpportunityRadarBoard,
} from "./OpportunityRadarBoard";
import { RiskBadge } from "./RiskBadge";
import { SignalChip } from "./SignalChip";
import { SignalGlossaryModal } from "./SignalGlossaryModal";
import { WatchlistRadar } from "./WatchlistRadar";
import { APP_MODULE_TO_BRAND, MODULE_BRAND } from "../brand/moduleBrand";
import { Phase2IntelPanels } from "./Phase2IntelPanels";
import { InstitutionalPanel } from "./InstitutionalPanel";
import { MotivFxLogo } from "./MotivFxLogo";
import { TodaysSignalsCard, type TodaysSignalRow } from "./TodaysSignalsCard";
import { useAssetDeepDive } from "../hooks/useAssetDeepDive";
import { useSignalDetail } from "../hooks/useSignalDetail";
import { formatSignalStrength } from "../config/productCopy";
import { homeScoreDetail, sentimentDetail, confidenceDetail, scenarioDetail } from "../utils/signalIntel";
import {
  brandModuleFromOpp,
  buildGraphLinkDetail,
  buildRadarCardDetail,
  buildThemeFromProbabilityView,
} from "../utils/themeIntel";
import { resolveMotiveRating, stanceLabel } from "../utils/motiveRating";
import type { BrandModuleId } from "../brand/moduleBrand";

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
  const { openDeepDive } = useAssetDeepDive();
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

  // Must run before any early return — Rules of Hooks.
  const todaysRows = useMemo((): TodaysSignalRow[] | undefined => {
    const themes = b?.probabilityViews?.filter((t) => t.id.startsWith("theme-")).slice(0, 4) ?? [];
    if (themes.length === 0) return undefined;
    const icons: TodaysSignalRow["icon"][] = ["home", "cpu", "chart", "globe"];
    return themes.map((t, i) => {
      const rising = t.direction === "up" || (t.deltaVsPrior ?? 0) > 0;
      const cooling = t.direction === "down" || (t.deltaVsPrior ?? 0) < 0;
      return {
        id: t.id,
        label: t.theme,
        status: rising ? "↑ Rising" : cooling ? "↓ Cooling" : "→ Stable",
        tone: (rising ? "up" : cooling ? "cool" : "down") as TodaysSignalRow["tone"],
        icon: icons[i % icons.length],
        hint: "Open theme detail",
      };
    });
  }, [b?.probabilityViews]);

  const themeRadarCards = useMemo(() => {
    const themes = mapThemesToRadarCards(b?.probabilityViews ?? []);
    if (themes.length) return themes;
    return mapOpportunitiesToRadarCards(b?.opportunities ?? []);
  }, [b?.probabilityViews, b?.opportunities]);

  const deskRadarCards = useMemo(
    () => mapOpportunitiesToRadarCards(b?.opportunities ?? []),
    [b?.opportunities]
  );

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

  const emergingCount = Math.max(1, Math.min(9, Math.round(b.opportunityCount / 3) || 1));

  function exploreSignalGraph() {
    document.getElementById("signal-graph")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
        <TodaysSignalsCard
          confidencePct={b.motivfxScore}
          newSignals={b.opportunityCount || 3}
          growingRisks={b.highRiskAlerts || 2}
          emerging={emergingCount}
          rows={todaysRows}
          onRowClick={(row) => {
            const theme = b.probabilityViews?.find((t) => t.id === row.id);
            inspectDetail(
              theme
                ? buildThemeFromProbabilityView(theme, b.opportunities, row.status)
                : buildRadarCardDetail(
                    {
                      id: row.id,
                      title: row.label,
                      signalScore: b.motivfxScore,
                      confidence: b.motivfxScore,
                      horizon: "Near term",
                      description: `${row.label} · ${row.status}`,
                      drivers: [],
                      beneficiaries: [],
                      affectedAssets: [],
                      status: row.status,
                      statusTone: row.tone === "cool" || row.tone === "down" ? "weakening" : "stable",
                      delta: 0,
                      sparkline: [40, 45, 50, 55, 52, 58, 60],
                      category: "macro",
                      band: row.tone === "cool" || row.tone === "down" ? "weakening" : "moderate",
                    },
                    b.opportunities
                  )
            );
          }}
          onConfidenceClick={() =>
            inspectDetail(homeScoreDetail(b.motivfxScore, b.marketConfidence, b.stars))
          }
          onFootClick={(key) => {
            if (key === "risks") {
              document.getElementById("home-alerts")?.scrollIntoView({ behavior: "smooth", block: "start" });
              window.dispatchEvent(new Event("motivefx:alerts-refresh"));
              return;
            }
            document.getElementById("opportunity-radar")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />

        <section className="home-overview-card home-overview-compact">
          <div className="home-overview-top">
            <div>
              <div className="home-overview-label">Daily Brief</div>
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
                <span>
                  Score <strong>{b.motivfxScore}</strong>
                </span>
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

        <OpportunityRadarBoard
          cards={themeRadarCards}
          updatedAt={b.generatedAt}
          onExploreGraph={exploreSignalGraph}
          onCardClick={(card) => inspectDetail(buildRadarCardDetail(card, b.opportunities))}
          subtitle="Tap a card for plain English + related watches · informational only"
        />
      </div>

      <Phase2IntelPanels
        briefing={b}
        onPrefsChanged={() => void refresh()}
        onInspectTheme={(theme) =>
          inspectDetail(buildThemeFromProbabilityView(theme, b.opportunities))
        }
        onInspectGraphLink={(link) =>
          inspectDetail(
            buildGraphLinkDetail({
              ...link,
              opportunities: b.opportunities,
            })
          )
        }
      />

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

      <OpportunityRadarBoard
        cards={deskRadarCards}
        updatedAt={b.generatedAt}
        compact
        sectionId="opportunity-radar-desk"
        title="Opportunity Radar · Desk"
        subtitle="Tap a card for related watches · informational only"
        onExploreGraph={exploreSignalGraph}
        onCardClick={(card) => inspectDetail(buildRadarCardDetail(card, b.opportunities))}
      />
      <section className="home-section" id="opportunity-radar-all">
        <div className="home-section-header">
          <h2><TrendingUp size={18} /> Desk detail</h2>
          <span className="home-section-sub">Symbols · signal chips · Why?</span>
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
                onClick={() => {
                  const mod = brandModuleFromOpp(o.module) as BrandModuleId;
                  openDeepDive(
                    {
                      symbol: o.symbol,
                      note: o.reasons?.[0] ?? o.title,
                      briefingNote: o.reasons?.slice(0, 2).join(" "),
                      side: /avoid|defensive|sell|caution/i.test(o.stance ?? o.title)
                        ? "sell"
                        : "buy",
                      matchup: o.module === "betting" ? o.symbol : undefined,
                      market: o.module === "predictions" ? o.symbol : undefined,
                      asset: o.module === "crypto" ? o.symbol : undefined,
                      timestamp: new Date().toISOString(),
                      id: o.id,
                    },
                    mod === "home" ? "trades" : mod
                  );
                }}
                title="Open full scorecard"
              >
                {o.symbol}
              </button>
              <div className="opportunity-title">{stanceLabel(o.stance ?? o.title)}</div>
              <div className="opportunity-metrics">
                <button
                  type="button"
                  className="opportunity-metric-btn"
                  onClick={() => inspectDetail(confidenceDetail(o.symbol, o.confidence, o.title))}
                  title="What is desk attention?"
                >
                  <span className="metric-label">Desk attention</span>
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
                    detail={{
                      symbol: o.symbol,
                      confidence: o.confidence,
                      contextLines: o.reasons?.slice(0, 3),
                      journalMeta: { module: o.module, symbol: o.symbol, signalTitle: o.title },
                      deepDiveModule:
                        brandModuleFromOpp(o.module) === "home"
                          ? "trades"
                          : (brandModuleFromOpp(o.module) as
                              | "trades"
                              | "pinkslips"
                              | "crypto"
                              | "betting"
                              | "predictions"),
                      deepDiveRow: {
                        symbol: o.symbol,
                        note: o.reasons?.[0] ?? o.title,
                        timestamp: new Date().toISOString(),
                        id: o.id,
                      },
                    }}
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
                    const mod = brandModuleFromOpp(topOpp.module);
                    openDeepDive(
                      {
                        symbol: topOpp.symbol,
                        note: topOpp.reasons?.[0] ?? topOpp.title,
                        briefingNote: topOpp.reasons?.slice(0, 2).join(" "),
                        timestamp: new Date().toISOString(),
                        id: topOpp.id,
                      },
                      mod === "home" ? "trades" : mod
                    );
                  } else {
                    onNavigate(m.tab as TabId);
                  }
                }}
                title={topOpp ? `Open $${topOpp.symbol} scorecard` : `Open ${m.label} desk`}
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
