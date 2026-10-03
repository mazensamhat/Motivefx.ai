import { ArrowRight, Bot, CalendarDays, ChevronDown, Search, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useHomeBriefing } from "../hooks/useHomeBriefing";
import type { TabId } from "../types";
import { HomeResearchDialog, type HomeResearchTarget } from "./HomeResearchDialog";
import { opportunityKind, opportunityView, reportedScore } from "../lib/homeOpportunityActions";
import { useSignalDetail } from "../hooks/useSignalDetail";
import { homeScoreDetail, resolveSignalDetail } from "../utils/signalIntel";
import "../styles/home-research.css";
import { AudioBriefingButton } from "./AudioBriefingButton";
import { Phase2IntelPanels } from "./Phase2IntelPanels";
import { InstitutionalPanel } from "./InstitutionalPanel";
import { WatchlistRadar } from "./WatchlistRadar";
import { IntelJournalPanel } from "./IntelJournalPanel";
import { HomeAlertsSection } from "./HomeAlertsSection";
import { CompareLensSection } from "./CompareLensSection";
import { FeatureGate } from "./FeatureGate";
import { MotiveTrackRecord, MotiveWatchAgents } from "./MotiveV2TrustLayer";
import { MotivePortfolioIntelligence } from "./MotiveV2PortfolioIntelligence";
import { MotiveMarketClose } from "./MotiveV2MarketClose";
import { MotiveDiscover } from "./MotiveV2Discover";
import { SinceYouWereAway } from "./MotiveV2SinceAway";
import { mapOpportunitiesToRadarCards, mapThemesToRadarCards, OpportunityRadarBoard } from "./OpportunityRadarBoard";

interface Props { onNavigate: (tab: TabId) => void; }

function moduleTab(module: string): TabId {
  if (module === "trades" || module === "stocks") return "stocks";
  if (module === "penny" || module === "pinkslips") return "penny";
  if (module === "crypto") return "crypto";
  if (module === "betting") return "betting";
  if (module === "predictions") return "predictions";
  return "home";
}

function riskLabel(risk: string) {
  return risk ? `${risk.charAt(0).toUpperCase()}${risk.slice(1)} risk` : "Risk monitored";
}

export function MotiveV2Home({ onNavigate }: Props) {
  const [review, setReview] = useState<HomeResearchTarget | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [proOpen, setProOpen] = useState(() => typeof window !== "undefined" && localStorage.getItem("motivefx_pro_open") === "1");
  useEffect(() => {
    const openPro = () => setProOpen(true);
    window.addEventListener("motivefx:pro-open", openPro);
    return () => window.removeEventListener("motivefx:pro-open", openPro);
  }, []);
  const { inspectDetail } = useSignalDetail();
  const { data: b, loading, error, refresh } = useHomeBriefing(60_000);
  const radar = useMemo(() => {
    if (!b) return [];
    const themed = mapThemesToRadarCards(b.probabilityViews ?? []);
    return themed.length ? themed : mapOpportunitiesToRadarCards(b.opportunities ?? []);
  }, [b]);

  if (loading && !b) return <div className="loading">Building your Motive brief…</div>;
  if (!b) return <div className="empty">Motive brief unavailable. <button className="btn btn-sm" onClick={() => void refresh()}>Retry</button></div>;

  const picks = [...b.opportunities].sort((a, z) => z.confidence - a.confidence).slice(0, showAll ? undefined : 4);
  const greeting = b.greeting || "Your Motive Brief";
  const highConfidence = b.opportunities.filter((o) => o.confidence >= 80).length;

  const ask = (prompt?: string) => window.dispatchEvent(new CustomEvent("motivefx:ask-open", { detail: { prompt } }));

  return (
    <div className="v2-home">
      {review && <HomeResearchDialog key={`${review.type}:${review.source.id}:${review.type === "opportunity" && review.adding ? "add" : "review"}`} target={review} opportunities={b.opportunities} generatedAt={b.generatedAt} onSelect={setReview} onClose={() => setReview(null)} onNavigate={onNavigate} />}
      {error && <div className="v2-warmup">Live feeds are catching up. Showing the latest available brief.</div>}

      <section className="v2-hero">
        <div className="v2-hero-copy">
          <span className="v2-eyebrow">MOTIVE AI</span>
          <h1>One AI. Every Market.</h1>
          <p className="v2-hero-markets">Stocks · Crypto · Sports · Predictions</p>
          <p className="v2-hero-sub">Find opportunities. Understand why. Track what changes.</p>
          <button className="v2-command" type="button" onClick={() => ask()}>
            <Search size={18} /><span>Search or ask Motive anything…</span><b>→</b>
          </button>
          <div className="v2-quick">
            {["Best opportunities today","Lower-risk ideas","Crypto movers","What changed?"].map((q) => (
              <button type="button" key={q} onClick={() => ask(q)}>{q}</button>
            ))}
          </div>
        </div>
        <div className="v2-hero-orb" aria-hidden><div className="v2-orb-core">M</div></div>
      </section>

      <section className="v2-kpis" aria-label="Motive summary">
        <button type="button" onClick={() => document.getElementById("opportunity-radar")?.scrollIntoView({behavior:"smooth"})}>
          <TrendingUp /><span><strong>{b.opportunityCount}</strong> opportunities</span>
        </button>
        <button type="button" onClick={() => document.getElementById("v2-picks")?.scrollIntoView({behavior:"smooth"})}>
          <Sparkles /><span><strong>{highConfidence}</strong> high-confidence</span>
        </button>
        <button type="button" onClick={() => ask("What risks are increasing?")}>
          <ShieldAlert /><span><strong>{b.highRiskAlerts}</strong> increasing risk</span>
        </button>
        <button type="button" onClick={() => ask("What events matter most today?")}>
          <CalendarDays /><span><strong>{b.breakingNewsCount}</strong> key events/news</span>
        </button>
      </section>

      <SinceYouWereAway briefing={b} />

      <section className="v2-section" id="v2-signals">
        <header className="v2-section-head">
          <div><span className="v2-eyebrow">SIGNALS</span><h2>Today&apos;s Signals</h2></div>
          <button type="button" onClick={() => ask("Explain today's strongest signals")}>Explain signals <ArrowRight size={14}/></button>
        </header>
        <div className="v2-signal-summary">
          <div><span>Motive Score</span><strong>{Math.round(b.motivfxScore)}</strong><em>/100</em></div>
          <div><span>New signals</span><strong>{b.opportunityCount}</strong></div>
          <div><span>Growing risks</span><strong>{b.highRiskAlerts}</strong></div>
          <div><span>Market confidence</span><strong>{b.marketConfidence}</strong></div>
        </div>
        <div className="v2-signal-list">
          {(b.probabilityViews ?? []).filter((v) => v.id.startsWith("theme-")).slice(0, 4).map((v) => (
            <button type="button" key={v.id} onClick={() => setReview({ type: "theme", source: v })}>
              <span>{v.theme}</span>
              <strong>{Math.round(v.probability)}</strong>
              <em>{v.direction === "up" ? "↑ Rising" : v.direction === "down" ? "↓ Cooling" : "→ Stable"}</em>
            </button>
          ))}
          {!(b.probabilityViews ?? []).some((v) => v.id.startsWith("theme-")) && (
            <button type="button" onClick={() => inspectDetail(homeScoreDetail(b.motivfxScore, b.marketConfidence, b.stars))}>
              <span>Composite Motive Signal</span><strong>{Math.round(b.motivfxScore)}</strong><em>{b.marketConfidence}</em>
            </button>
          )}
        </div>
      </section>

      <section className="v2-section" id="v2-picks">
        <header className="v2-section-head">
          <div><span className="v2-eyebrow">FOR YOU</span><h2>Motive AI likes today</h2></div>
          <button type="button" onClick={() => setShowAll((v) => !v)}>{showAll ? "Show fewer" : "See all"} <ArrowRight size={14}/></button>
        </header>
        <div className="v2-picks-grid">
          {picks.length ? picks.map((o) => (
            <article className="v2-pick-card home-action-card" key={o.id}>
              <div className="v2-pick-top"><button type="button" className="home-pick-title" aria-label={`Review ${o.symbol}`} onClick={() => setReview({ type: "opportunity", source: o })}>{o.symbol}</button><span className={`v2-view ${opportunityView(o).toLowerCase()}`}>{opportunityView(o)}</span></div>
              <div className="v2-signal"><span>Motive Signal</span><b>{reportedScore(o.confidence) ?? "—"}</b><em>/100</em></div>
              <div className="v2-pick-meta"><span>{reportedScore(o.modelConfidence) != null ? `Reported confidence ${reportedScore(o.modelConfidence)}/100` : "Evidence confidence not provided"}</span><span>{riskLabel(o.riskLevel)}</span></div>
              <p>{o.reasons?.[0] ?? o.title}</p>
              <div className="home-pick-actions">
                <button type="button" className="btn" onClick={() => setReview({ type: "opportunity", source: o })}>Review</button>
                <button type="button" className="btn" aria-label={`Add ${o.symbol} to portfolio`} disabled={!opportunityKind(o.module)} onClick={() => setReview({ type: "opportunity", source: o, adding: true })}>Add to portfolio</button>
                <button type="button" className="btn" onClick={() => ask(`Review the ${o.module} briefing item ${o.symbol}: ${o.title}. Separate the source signal from a calibrated probability.`)}>Ask Motive</button>
              </div>
            </article>
          )) : <div className="v2-empty-card">Live opportunities are warming up.</div>}
        </div>
      </section>

      <MotiveDiscover briefing={b} onReview={(o) => setReview({ type: "opportunity", source: o })} />

      <div className="v2-split">
        <section className="v2-panel">
          <header><div><span className="v2-eyebrow">YOUR BRIEF</span><h2>{greeting}</h2></div>{b.audioBriefingScript && <AudioBriefingButton script={b.audioBriefingScript} />}</header>
          <p className="v2-lead">{b.topAiTip || b.biggestOpportunity}</p>
          <div className="v2-brief-row"><Sparkles size={16}/><span>Top opportunity</span><strong>{b.biggestOpportunity || "Scanning…"}</strong></div>
          <div className="v2-brief-row risk"><ShieldAlert size={16}/><span>Risk lens</span><strong>{b.biggestRisk || "No major change"}</strong></div>
          <button className="v2-primary" type="button" onClick={() => ask("Explain today's Motive Brief")}>Ask Motive about this</button>
        </section>

        <section className="v2-panel">
          <header><div><span className="v2-eyebrow">MARKETS</span><h2>Market activity</h2></div></header>
          <div className="v2-market-list">
            {b.moduleSummaries.map((m) => (
              <button key={m.module} type="button" onClick={() => onNavigate(moduleTab(m.module))}>
                <span>{m.label}</span><strong>{m.count} tracked</strong><em>{m.newSignals ? `+${m.newSignals} new` : "Open desk"}</em>
              </button>
            ))}
          </div>
        </section>
      </div>

      <OpportunityRadarBoard
        cards={radar}
        updatedAt={b.generatedAt}
        title="Opportunity Radar™"
        subtitle="Developing situations ranked by Motive signal strength"
        onCardClick={(card) => {
          const opportunity = b.opportunities.find((o) => o.id === card.id);
          const theme = b.probabilityViews?.find((v) => v.id === card.id);
          if (opportunity) setReview({ type: "opportunity", source: opportunity });
          else if (theme) setReview({ type: "theme", source: theme });
        }}
      />


      <FeatureGate feature="portfolio_intelligence"><MotivePortfolioIntelligence /></FeatureGate>
      <MotiveMarketClose />
      <FeatureGate feature="advanced_analytics"><MotiveTrackRecord /></FeatureGate>
      <FeatureGate feature="push_notifications"><MotiveWatchAgents briefing={b} onPrefsChanged={() => void refresh()} /></FeatureGate>

      <section className="v2-pro-legacy" id="v2-pro-intelligence">
        <header className="v2-section-head">
          <div><span className="v2-eyebrow">PRO INTELLIGENCE</span><h2>Deep intelligence</h2><p className="home-section-sub">Advanced relationship, scenario, genome, journal and institutional context.</p></div>
          <button type="button" className="v2-pro-toggle" aria-expanded={proOpen} onClick={() => { const next=!proOpen; setProOpen(next); localStorage.setItem("motivefx_pro_open", next ? "1" : "0"); }}><ChevronDown size={15} style={{transform:proOpen?"rotate(180deg)":"none"}} />{proOpen ? "Hide Pro" : "Show Pro"}</button>
        </header>
        {!proOpen ? <div className="v2-pro-summary">Core signals, picks, scanner, Radar, Portfolio Intelligence, Market Close and Ask Motive stay visible above. Open Pro for relationship graphs, scenario branches, genome intelligence, alerts, journal and institutional tools.</div> : <>
          <Phase2IntelPanels briefing={b} onPrefsChanged={() => void refresh()}
            onInspectTheme={(theme) => setReview({ type: "theme", source: theme })}
            onInspectGraphLink={(link) => inspectDetail(resolveSignalDetail(`${link.hubLabel} → ${link.satLabel}`, {
              confidence: Math.round(link.weight * 100),
              category: "Relationship Graph",
              contextLines: [link.relation, `Relationship strength ${Math.round(link.weight * 100)}/100`],
              journalNote: `${link.hubLabel} → ${link.satLabel}: ${link.relation}`,
            }))} />
          <InstitutionalPanel />
          <WatchlistRadar personalized={b.personalized} onNavigateModule={(tab) => onNavigate(tab as TabId)} />
          <FeatureGate feature="decision_history"><IntelJournalPanel /></FeatureGate>
          <FeatureGate feature="push_notifications"><HomeAlertsSection /></FeatureGate>
          {b.compareLens && b.compareLens.length > 0 && <CompareLensSection items={b.compareLens} />}
        </>}
      </section>

      <section className="v2-ask-strip">
        <div className="v2-ask-icon"><Bot size={24}/></div>
        <div><span className="v2-eyebrow">ASK MOTIVE</span><h2>Turn all that market noise into an answer.</h2><p>Ask about a pick, your portfolio, risk, news, or what changed.</p></div>
        <button className="v2-primary" type="button" onClick={() => ask()}>Open Ask Motive <ArrowRight size={16}/></button>
      </section>
    </div>
  );
}
