import { useEffect, useRef, useState } from "react";
import { Globe, Ticket, Trash2, Wand2 } from "lucide-react";
import { apiDelete, apiGet, apiPost } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useModules } from "../hooks/useModules";
import { useSavedLedger } from "../hooks/useSavedLedger";
import type { AdvisorResult, PredictionMarket } from "../types";
import { SPORTS, PREDICTION_CATEGORIES, sportCategory, predictionCategory, positionCategoryLabel } from "../utils/positionCategories";
import { TerminalRow } from "./TerminalRow";

export interface SavedLedgerProps {
  onAnalyzed: (data: AdvisorResult) => void;
  analyzing: boolean;
  setAnalyzing: (v: boolean) => void;
  simulationMode?: boolean;
}
interface Position {
  id: string | number; matchup?: string; market?: string; pick: string;
  odds?: string | null; stake?: number | null; sport?: string; category?: string;
  sportsbook?: string | null; yes_price?: number | null; outcome?: string | null;
  pnl?: number | null; is_simulation?: boolean | number; status?: string;
  created_at?: string; settled_at?: string | null;
}
const formatNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "Not recorded";
export function SavedPositionLedger({ kind, onAnalyzed, analyzing, setAnalyzing, simulationMode }: SavedLedgerProps & { kind: "betting" | "predictions" }) {
  const { isAuthenticated, user, openAuth } = useAuth();
  const { refresh: refreshModules } = useModules();
  const userId = isAuthenticated ? user?.userId : undefined;
  const ledger = useSavedLedger<Position>(userId, kind);
  const betting = kind === "betting";
  const choices = betting ? SPORTS : PREDICTION_CATEGORIES;
  const classify = betting ? sportCategory : predictionCategory;
  const [filter, setFilter] = useState("all");
  const [newCategory, setNewCategory] = useState("");
  const [title, setTitle] = useState("");
  const [pick, setPick] = useState(betting ? "" : "Yes");
  const [odds, setOdds] = useState("");
  const [stake, setStake] = useState("");
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | number | null>(null);
  const mutation = useRef(false);
  const [lastResult, setLastResult] = useState<{ won: boolean; pnl: number } | null>(null);
  useEffect(() => {
    if (betting) return;
    let current = true;
    apiGet<{items:PredictionMarket[]}>("/predictions/markets?limit=20").then((d) => { if (current) setMarkets(d.items ?? []); }).catch(() => {});
    return () => { current = false; };
  }, [betting]);
  useEffect(() => { setFilter("all"); setTitle(""); setNewCategory(""); setPick(betting ? "" : "Yes"); setError(null); setNotice(null); }, [userId, betting]);
  useEffect(() => {
    const changed = (e: Event) => { if ((e as CustomEvent<{kind?:string}>).detail?.kind === kind) setFilter("all"); };
    window.addEventListener("motivefx:portfolio-changed", changed);
    return () => window.removeEventListener("motivefx:portfolio-changed", changed);
  }, [kind]);
  function changed() {
    window.dispatchEvent(new Event("motivefx:briefing-refresh"));
    window.dispatchEvent(new CustomEvent("motivefx:portfolio-changed", { detail: { kind } }));
  }
  async function add() {
    if (!userId) { openAuth("login"); return; }
    if (mutation.current) return;
    if (!title.trim() || !pick.trim() || !newCategory) { setError("Choose a category and enter the event and selection."); return; }
    if (betting && !odds.trim()) { setError("Enter the recorded odds for this bet."); return; }
    const amount = stake.trim() ? Number(stake) : 0;
    if (!Number.isFinite(amount) || amount < 0) { setError("Stake must be zero or a positive number."); return; }
    mutation.current = true; setSaving(true); setError(null); setNotice(null);
    try {
      const match = markets.find((m) => m.market === title);
      const body = betting
        ? { user_id: userId, matchup: title.trim(), pick: pick.trim(), sport: newCategory, odds: odds.trim(), stake: amount }
        : { user_id: userId, market: title.trim(), pick, category: newCategory, stake: amount, ...(match?.yes != null ? { yes_price: match.yes } : {}) };
      const result = await apiPost<{simulation?:{won:boolean;pnl:number}}>(`/advisor/${kind}/${betting ? "bets" : "positions"}`, body);
      if (result.simulation) { setLastResult(result.simulation); void refreshModules(); }
      setTitle(""); setPick(betting ? "" : "Yes"); setOdds(""); setStake(""); setFilter("all");
      setNotice("Saved. Refreshing your recorded positions…"); changed();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save the position."); }
    finally { mutation.current = false; setSaving(false); }
  }
  async function remove(row: Position) {
    if (!userId || mutation.current) return;
    mutation.current = true; setRemoving(row.id); setError(null);
    try {
      await apiDelete(`/advisor/${kind}/${betting ? "bets" : "positions"}/${encodeURIComponent(userId)}/${encodeURIComponent(String(row.id))}`);
      setNotice("Entry removed. Refreshing your ledger…"); changed();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not remove the position. It remains saved."); }
    finally { mutation.current = false; setRemoving(null); }
  }
  async function analyze() {
    if (!userId) { openAuth("login"); return; }
    setAnalyzing(true); setError(null);
    try {
      const result = await apiPost<AdvisorResult>(`/advisor/${kind}/analyze?user_id=${encodeURIComponent(userId)}`, {});
      if (betting && !result.picks?.length) {
        // Optional picks must not discard an otherwise successful portfolio analysis.
        try { const extra = await apiGet<{picks:AdvisorResult["picks"]}>("/advisor/betting/picks"); result.picks = extra.picks; } catch { /* Keep the analysis. */ }
      }
      onAnalyzed(result);
    } catch (e) { setError(e instanceof Error ? e.message : "Analysis is temporarily unavailable."); }
    finally { setAnalyzing(false); }
  }
  const visible = ledger.rows.filter((r) => filter === "all" || classify(betting ? r.sport : r.category) === filter);
  const Icon = betting ? Ticket : Globe;
  return <section className="card glass-card portfolio-ledger">
    <header className="card-header card-header-bold"><h2 className="card-title card-title-lg"><Icon size={18} /> {betting ? "My Bets" : "My Predictions"}</h2>
      <button type="button" className="btn btn-accent-terminal btn-sm" disabled={analyzing || !ledger.loaded || !!ledger.error} onClick={() => void analyze()}><Wand2 size={12} /> {analyzing ? "Analyzing…" : betting ? "AI Grade & Picks" : "AI Analyze"}</button>
    </header>
    <div className="ledger-controls" style={{ padding: "1rem", display: "flex", flexWrap: "wrap", gap: ".65rem", alignItems: "center" }}>
      <label>Filter saved {betting ? "bets by sport" : "predictions by category"} <select aria-label={betting ? "Filter saved bets" : "Filter saved predictions"} value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="all">All {betting ? "sports" : "categories"} ({ledger.rows.length})</option>
        {choices.map((c) => <option value={c.value} key={c.value}>{c.label} ({ledger.rows.filter((r) => classify(betting ? r.sport : r.category) === c.value).length})</option>)}
      </select></label><button type="button" className="btn btn-ghost btn-sm" disabled={ledger.loading} onClick={() => void ledger.reload()}>{ledger.loading ? "Refreshing…" : "Refresh saved entries"}</button>
    </div>
    <p className="ledger-hint">The filter above controls your saved entries. The fields below add a new entry.</p>
    <div className={`portfolio-form portfolio-form-terminal ${betting ? "portfolio-form-bets" : "portfolio-form-predictions"}`}>
      <select className="pf-span-3" aria-label={betting ? "Sport for new bet" : "Category for new prediction"} value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
        <option value="">Choose {betting ? "sport" : "category"}…</option>{choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
      <input className="pf-span-3" aria-label={betting ? "Matchup" : "Market"} list={betting ? undefined : "saved-prediction-markets"} placeholder={betting ? "Matchup (Flyers @ Devils)" : "Prediction market"} value={title} onChange={(e) => {
        setTitle(e.target.value); const match = markets.find((m) => m.market === e.target.value); if (!betting && match?.category) setNewCategory(predictionCategory(match.category));
      }} />
      {!betting && <datalist id="saved-prediction-markets">{markets.map((m) => <option key={m.market} value={m.market} />)}</datalist>}
      {betting ? <input className="pf-span-2" aria-label="Bet selection" placeholder="Your selection" value={pick} onChange={(e) => setPick(e.target.value)} /> : <select className="pf-span-2" aria-label="Prediction selection" value={pick} onChange={(e) => setPick(e.target.value)}><option value="Yes">Yes</option><option value="No">No</option></select>}
      {betting && <input className="pf-span-2" aria-label="Recorded odds" placeholder="Recorded odds" value={odds} onChange={(e) => setOdds(e.target.value)} />}
      <input className="pf-span-2" type="number" min="0" step="any" aria-label="Recorded stake" placeholder="Stake (optional)" value={stake} onChange={(e) => setStake(e.target.value)} />
      <button type="button" className="btn btn-form-add pf-span-12" disabled={saving || removing !== null} onClick={() => void add()}>{saving ? "Saving…" : simulationMode ? "Add & simulate entry" : betting ? "+ Add Bet" : "+ Add Position"}</button>
    </div>
    {error && <p className="portfolio-form-error" role="alert">{error}</p>}
    {notice && <p className="ledger-hint" role="status">{notice}</p>}
    {ledger.error && <div className="portfolio-form-error" role="alert">{ledger.error} <button type="button" className="btn btn-ghost btn-sm" onClick={() => void ledger.reload()}>Retry saved entries</button></div>}
    {lastResult && simulationMode && <div className={`simulation-result-toast ${lastResult.won ? "won" : "lost"}`}>Simulation result: {lastResult.won ? "WON" : "LOST"} · {formatNumber(lastResult.pnl)}</div>}
    <div className="card-body flush terminal-feed">
      {!userId ? <div className="empty">Sign in to load your saved positions. <button type="button" className="btn btn-sm" onClick={() => openAuth("login")}>Sign in</button></div>
        : ledger.loading && !ledger.loaded ? <div className="loading" role="status">Loading your saved positions…</div>
        : !visible.length && !ledger.error ? <div className="empty">{filter !== "all" ? "No saved entries match this filter. Choose All to see the complete ledger." : ledger.loaded ? "No saved entries in this ledger yet." : "Saved entries have not loaded yet."}</div>
        : visible.map((row) => {
          const name = betting ? row.matchup ?? "Recorded bet" : row.market ?? "Recorded prediction";
          const raw = betting ? row.sport : row.category;
          const label = positionCategoryLabel(kind, raw);
          return <TerminalRow key={row.id} tag={{ label: `${label}${raw && raw.toLowerCase() !== classify(raw) ? ` · ${raw}` : ""}`, variant: "neutral" }} primary={name}
            secondary={`${row.pick} · ${betting ? row.odds ?? "Odds not recorded" : row.yes_price != null ? `Recorded YES price ${(row.yes_price * 100).toFixed(0)}¢` : "Price not recorded"} · Stake ${formatNumber(row.stake)}`}
            meta={<span>{row.status ?? (row.outcome ? "settled" : "open")}{row.is_simulation ? " · SIM" : ""}</span>}
            detail={<div aria-label={`Details for ${name}`}>
              <h3>{name}</h3><dl><dt>{betting ? "Sport / league" : "Category"}</dt><dd>{label} · {raw || "Not recorded"}</dd>
                <dt>Selection</dt><dd>{row.pick}</dd><dt>{betting ? "Recorded odds" : "Recorded YES price"}</dt><dd>{betting ? row.odds || "Not recorded" : row.yes_price != null ? `${(row.yes_price * 100).toFixed(2)}¢` : "Not recorded"}</dd>
                {betting && <><dt>Sportsbook</dt><dd>{row.sportsbook || "Not recorded"}</dd></>}
                <dt>Stake</dt><dd>{formatNumber(row.stake)}</dd><dt>Saved</dt><dd>{row.created_at ? new Date(row.created_at).toLocaleString() : "Not recorded"}</dd>
                <dt>Status</dt><dd>{row.status ?? "open"}{row.outcome ? ` · ${row.outcome}` : ""}</dd>
                {row.pnl != null && <><dt>Recorded profit / loss</dt><dd>{formatNumber(row.pnl)}</dd></>}
              </dl><p>These are saved entry details, not a live quote or an AI forecast.</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.dispatchEvent(new CustomEvent("motivefx:ask-open", { detail: { prompt: `Review my recorded ${betting ? "bet" : "prediction"}: ${name}; category ${label}; selection ${row.pick}; ${betting ? `odds ${row.odds ?? "not recorded"}` : `YES price ${row.yes_price ?? "not recorded"}`}. Explain available evidence and risks. Do not treat missing data as zero or invent live odds.` } }))}>Ask Motive about this entry</button>
            </div>}
            actions={<button type="button" className="btn-icon btn-icon-danger" aria-label={`Remove ${name}`} disabled={removing !== null || saving} onClick={(e) => { e.preventDefault(); e.stopPropagation(); void remove(row); }}><Trash2 size={14} /></button>} />;
        })}
    </div>
  </section>;
}
