import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Briefcase, Clock3, RefreshCw, Search, SlidersHorizontal, Sunset } from "lucide-react";
import type { HomeBriefing, HomeOpportunity, TabId } from "../types";
import { apiGet } from "../lib/api";

type Review = (opportunity: HomeOpportunity) => void;
type Ask = (prompt: string) => void;

export function MotiveSinceAway({ briefing }: { briefing: HomeBriefing }) {
  const key = "motivefx_v2_last_brief";
  const [previous, setPrevious] = useState<string | null>(null);

  useEffect(() => {
    try {
      setPrevious(localStorage.getItem(key));
      localStorage.setItem(key, briefing.generatedAt);
    } catch {
      /* storage is optional */
    }
  }, [briefing.generatedAt]);

  const changed = [...briefing.opportunities]
    .filter((item) => item.deltaVsPrior != null && item.deltaVsPrior !== 0)
    .sort((a, b) => Math.abs(b.deltaVsPrior ?? 0) - Math.abs(a.deltaVsPrior ?? 0))
    .slice(0, 3);
  const newSignals = briefing.moduleSummaries.reduce((n, item) => n + (item.newSignals ?? 0), 0);

  return <section className="v2-since-away" aria-label="Since your last brief">
    <div>
      <span className="v2-eyebrow">SINCE YOUR LAST BRIEF</span>
      <h2>{previous ? String(newSignals) + " new portfolio-linked signal" + (newSignals === 1 ? "" : "s") : "Baseline established on this device"}</h2>
      <p>{previous ? "Compared with the brief last seen " + new Date(previous).toLocaleString() + "." : "Future visits will summarize what changed instead of inventing earlier device history."}</p>
    </div>
    <div className="v2-since-chips">
      {changed.length ? changed.map((item) =>
        <span key={item.id}>{item.symbol + " " + ((item.deltaVsPrior ?? 0) > 0 ? "+" : "") + Math.round(item.deltaVsPrior ?? 0) + " pts"}</span>
      ) : <span>No recorded signal deltas yet</span>}
    </div>
  </section>;
}

export function MotiveDiscover({ briefing, onReview, onAsk, onNavigate }: {
  briefing: HomeBriefing;
  onReview: Review;
  onAsk: Ask;
  onNavigate: (tab: TabId) => void;
}) {
  const [market, setMarket] = useState("all");
  const [minimum, setMinimum] = useState(0);
  const [risk, setRisk] = useState("all");
  const [direction, setDirection] = useState("all");
  const [relevant, setRelevant] = useState(false);
  const [changed, setChanged] = useState(false);
  const relevantSymbols = new Set((briefing.personalized?.radarHits ?? []).map((item) => item.symbol.toUpperCase()));

  const rows = useMemo(() => briefing.opportunities.filter((item) => {
    if (market !== "all" && item.module !== market) return false;
    if (item.confidence < minimum) return false;
    if (risk !== "all" && item.riskLevel !== risk) return false;
    if (direction !== "all" && (item.direction ?? "neutral") !== direction) return false;
    if (relevant && !relevantSymbols.has(item.symbol.toUpperCase())) return false;
    if (changed && !(item.deltaVsPrior != null && Math.abs(item.deltaVsPrior) >= 1)) return false;
    return true;
  }), [briefing.opportunities, market, minimum, risk, direction, relevant, changed]);

  function tab(module: string): TabId {
    if (module === "trades") return "stocks";
    if (module === "penny") return "penny";
    if (module === "crypto") return "crypto";
    if (module === "betting") return "betting";
    if (module === "predictions") return "predictions";
    return "home";
  }

  return <section className="v2-section v2-discover" id="v2-discover">
    <header className="v2-section-head">
      <div><span className="v2-eyebrow">DISCOVER</span><h2><Search size={18}/> Cross-market scanner</h2><p>One evidence-ranked view across every active desk.</p></div>
      <SlidersHorizontal size={18}/>
    </header>
    <div className="v2-discover-filters">
      <label>Market<select value={market} onChange={(e) => setMarket(e.target.value)}><option value="all">All markets</option><option value="trades">Stocks</option><option value="penny">Pink Sheets</option><option value="crypto">Crypto</option><option value="betting">Sports</option><option value="predictions">Predictions</option></select></label>
      <label>Min signal<select value={minimum} onChange={(e) => setMinimum(Number(e.target.value))}><option value="0">Any</option><option value="60">60+</option><option value="70">70+</option><option value="80">80+</option></select></label>
      <label>Risk<select value={risk} onChange={(e) => setRisk(e.target.value)}><option value="all">Any</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="extreme">Extreme</option></select></label>
      <label>Direction<select value={direction} onChange={(e) => setDirection(e.target.value)}><option value="all">Any</option><option value="up">Rising</option><option value="neutral">Neutral</option><option value="down">Falling</option></select></label>
      <label className="v2-check"><input type="checkbox" checked={changed} onChange={(e) => setChanged(e.target.checked)}/> Changed</label>
      <label className="v2-check"><input type="checkbox" checked={relevant} onChange={(e) => setRelevant(e.target.checked)}/> My radar</label>
    </div>
    <div className="v2-discover-grid">
      {rows.map((item) => <article key={item.id} className="v2-discover-card">
        <div><span>{item.module}</span><strong>{item.symbol}</strong></div>
        <div className="v2-discover-score"><b>{Math.round(item.confidence)}</b><small>/100 Motive Signal</small></div>
        <p>{item.title}</p>
        <small>{item.riskLevel + " risk · evidence confidence " + (item.modelConfidence != null ? Math.round(item.modelConfidence) + "/100" : "not provided") + (item.deltaVsPrior != null ? " · Δ " + (item.deltaVsPrior > 0 ? "+" : "") + Math.round(item.deltaVsPrior) : "")}</small>
        <div className="home-pick-actions">
          <button className="btn" type="button" onClick={() => onReview(item)}>Review</button>
          <button className="btn" type="button" onClick={() => onAsk("Review " + item.symbol + " from Discover. Separate Motive Signal from any calibrated probability.")}>Ask Motive</button>
          <button className="btn" type="button" onClick={() => onNavigate(tab(item.module))}>Open desk <ArrowRight size={13}/></button>
        </div>
      </article>)}
      {!rows.length && <div className="v2-empty-card">No current items match these filters.</div>}
    </div>
  </section>;
}

type PortfolioIntel = {
  generatedAt: string;
  totalPositions: number;
  signalCoverage: number;
  watchlistCount: number;
  marketCounts: Array<{ module: string; count: number }>;
  concentration: { module: string; count: number; sharePct: number } | null;
  note: string;
  positions: Array<{
    module: string; label: string; symbol: string; quantity: number | null; avgCost: number | null;
    status?: string; pick?: string; motiveSignal: number | null; evidenceConfidence: number | null;
    stance: string | null; signalChange: number | null; signalRecordedAt: string | null;
  }>;
};

export function MotivePortfolioIntelligence({ onAsk }: { onAsk: Ask }) {
  const [data, setData] = useState<PortfolioIntel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try { setData(await apiGet<PortfolioIntel>("/intel/portfolio-intelligence")); }
    catch (e) { setError(e instanceof Error ? e.message : "Portfolio Intelligence unavailable."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void load();
    const handler = () => void load();
    window.addEventListener("motivefx:portfolio-changed", handler);
    return () => window.removeEventListener("motivefx:portfolio-changed", handler);
  }, []);

  return <section className="v2-section v2-completion-panel" id="v2-portfolio-intelligence">
    <header className="v2-section-head"><div><span className="v2-eyebrow">WHOLE BOOK</span><h2><Briefcase size={18}/> Portfolio Intelligence</h2></div><button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={14}/> Refresh</button></header>
    {error ? <p className="v2-warmup" role="alert">{error}</p> : !data ? <p className="loading">Reading authorized ledgers…</p> : <>
      <div className="v2-trust-kpis">
        <div><span>Open tracked positions</span><strong>{data.totalPositions}</strong></div>
        <div><span>Signal coverage</span><strong>{data.signalCoverage + "/" + data.totalPositions}</strong></div>
        <div><span>Radar names</span><strong>{data.watchlistCount}</strong></div>
        <div><span>Largest count exposure</span><strong>{data.concentration ? data.concentration.module + " " + data.concentration.sharePct + "%" : "—"}</strong></div>
      </div>
      <div className="v2-market-counts">{data.marketCounts.map((item) => <span key={item.module}>{item.module} <b>{item.count}</b></span>)}</div>
      <div className="v2-portfolio-intel-list">{data.positions.map((position, index) => <article key={position.module + "-" + position.symbol + "-" + index}>
        <div><strong>{position.symbol}</strong><span>{position.label}</span></div>
        <div><b>{position.motiveSignal != null ? Math.round(position.motiveSignal) : "—"}</b><span>Motive Signal</span></div>
        <p>{position.stance ? "Model view: " + position.stance.replaceAll("_", " ") : "No current recorded stance"}{position.signalChange != null ? " · Δ " + (position.signalChange > 0 ? "+" : "") + position.signalChange : ""}</p>
      </article>)}</div>
      {!data.positions.length && <p className="v2-trust-note">No verified saved positions were returned. A failed read is shown as an error, never as an empty portfolio.</p>}
      <p className="v2-trust-note">{data.note}</p>
      <button type="button" className="v2-primary" onClick={() => onAsk("Review my whole portfolio across every market. Highlight concentration, signal changes and cross-market risk without treating Motive Signal as probability.")}>Ask Motive about my whole book</button>
    </>}
  </section>;
}

type CloseRow = { symbol: string; motiveSignal: number | null; delta: number | null };
type CloseData = { generatedAt: string; note: string; strengthened: CloseRow[]; weakened: CloseRow[]; steady: CloseRow[]; newSignals: CloseRow[]; carryForward: CloseRow[] };

export function MotiveMarketClose({ onAsk }: { onAsk: Ask }) {
  const [data, setData] = useState<CloseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try { setData(await apiGet<CloseData>("/intel/market-close")); }
    catch (e) { setError(e instanceof Error ? e.message : "Market Close unavailable."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function lane(title: string, rows: CloseRow[]) {
    return <div className="v2-close-lane"><h3>{title}</h3>{rows.length ? rows.slice(0, 5).map((row) =>
      <div key={title + "-" + row.symbol}><strong>{row.symbol}</strong><span>{(row.motiveSignal != null ? Math.round(row.motiveSignal) + "/100" : "—") + (row.delta != null ? " · " + (row.delta > 0 ? "+" : "") + row.delta : "")}</span></div>
    ) : <p>No recorded changes in this lane.</p>}</div>;
  }

  return <section className="v2-section v2-completion-panel" id="v2-market-close">
    <header className="v2-section-head"><div><span className="v2-eyebrow">MARKET CLOSE</span><h2><Sunset size={18}/> What changed into the close</h2></div><button onClick={() => void load()} disabled={loading} type="button"><RefreshCw size={14}/> Refresh</button></header>
    {error ? <p className="v2-warmup">{error}</p> : !data ? <p className="loading">Building the recorded close tape…</p> : <>
      <div className="v2-close-grid">{lane("Strengthened", data.strengthened)}{lane("Weakened", data.weakened)}{lane("Carry forward", data.carryForward)}</div>
      <p className="v2-trust-note">{data.note}</p>
      <button className="btn" type="button" onClick={() => onAsk("Explain Market Close: what strengthened, weakened, and carries into the next session? Use recorded evidence only.")}><Clock3 size={14}/> Ask Motive about the close</button>
    </>}
  </section>;
}
