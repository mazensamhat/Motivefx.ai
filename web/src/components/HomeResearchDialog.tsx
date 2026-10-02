import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { HomeOpportunity, ProbabilityView, TabId } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useModules } from "../hooks/useModules";
import { apiPost } from "../lib/api";
import { buildOpportunitySave, EMPTY_SAVE_DRAFT, HOME_CATEGORIES, HOME_SPORTS, opportunityKind,
  opportunityTab, relatedOpportunities, reportedScore, saveWasAcknowledged, type SaveDraft } from "../lib/homeOpportunityActions";

export type HomeResearchTarget = { type: "opportunity"; source: HomeOpportunity; adding?: boolean }
  | { type: "theme"; source: ProbabilityView };
interface Props {
  target: HomeResearchTarget;
  opportunities: HomeOpportunity[];
  generatedAt?: string;
  onSelect: (target: HomeResearchTarget) => void;
  onClose: () => void;
  onNavigate: (tab: TabId) => void;
}
export function HomeResearchDialog({ target, opportunities, generatedAt, onSelect, onClose, onNavigate }: Props) {
  const { isAuthenticated, user, openAuth } = useAuth();
  const { hasModule, isSimulationOnly } = useModules();
  const owner = isAuthenticated ? user?.userId ?? "" : "";
  const ownerRef = useRef(owner); ownerRef.current = owner;
  const previousOwner = useRef(owner);
  const panel = useRef<HTMLElement>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  const [draft, setDraft] = useState<SaveDraft>({ ...EMPTY_SAVE_DRAFT });
  const [adding, setAdding] = useState(target.type === "opportunity" && target.adding === true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sourceTimestamp] = useState(generatedAt);
  const [marketQuestion, setMarketQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const opp = target.type === "opportunity" ? target.source : null;
  const theme = target.type === "theme" ? target.source : null;
  const kind = opp ? opportunityKind(opp.module) : null;
  const title = opp?.symbol ?? theme?.theme ?? "Research detail";
  const score = reportedScore(opp?.confidence ?? theme?.probability);
  const related = theme ? relatedOpportunities(theme, opportunities) : [];
  const sim = kind ? isSimulationOnly(kind) : false;
  const update = (key: keyof SaveDraft, value: string) => setDraft((v) => ({ ...v, [key]: value }));

  useEffect(() => {
    mounted.current = true;
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const nodes = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { mounted.current = false; window.removeEventListener("keydown", onKey); origin?.focus(); };
  }, []);
  useEffect(() => {
    if (previousOwner.current && previousOwner.current !== owner) closeRef.current();
    previousOwner.current = owner;
  }, [owner]);

  function ask() {
    const evidence = opp?.reasons ?? theme?.supportingFactors ?? [];
    const prompt = `Review this Motive briefing item: ${title}. Reported context: ${evidence.slice(0, 3).join("; ")}. Distinguish recorded evidence from data you cannot verify. A Motive Signal is not a win probability.`;
    onClose();
    window.dispatchEvent(new CustomEvent("motivefx:ask-open", { detail: { prompt } }));
  }
  async function save() {
    if (pending.current || !opp || !kind) return;
    if (!owner) { openAuth("login"); return; }
    if (!hasModule(kind)) { setError("Your current access does not include this market. Open Account to review your plan."); return; }
    let request: ReturnType<typeof buildOpportunitySave>;
    try {
      if (kind === "predictions" && !marketQuestion.trim()) throw new Error("Confirm the full market question. The briefing may abbreviate its title.");
      request = buildOpportunitySave(kind === "predictions" ? { ...opp, symbol: marketQuestion.trim() } : opp, owner, draft);
    }
    catch (e) { setError(e instanceof Error ? e.message : "Check the saved-position fields."); return; }
    const account = owner;
    pending.current = true; setSaving(true); setError(null);
    try {
      const result = await apiPost<unknown>(request.path, request.body);
      if (!saveWasAcknowledged(result, request.kind)) throw new Error("The server did not confirm this save. Check your portfolio before retrying.");
      if (mounted.current && account === ownerRef.current) setSaved(true);
      window.dispatchEvent(new CustomEvent("motivefx:portfolio-changed", { detail: { kind: request.kind } }));
      window.dispatchEvent(new Event("motivefx:briefing-refresh"));
    } catch (e) {
      if (mounted.current && account === ownerRef.current) setError(e instanceof Error ? e.message : "The save could not be confirmed. Your entered details have been retained.");
    } finally {
      pending.current = false;
      if (mounted.current && account === ownerRef.current) setSaving(false);
    }
  }

  return createPortal(<div className="home-research-overlay" onClick={onClose}>
    <section className="home-research-dialog" ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="home-research-title" onClick={(e) => e.stopPropagation()}>
      <header><div><span className="v2-eyebrow">{theme ? "THEME EVIDENCE" : "OPPORTUNITY REVIEW"}</span><h2 id="home-research-title">{title}</h2></div>
        <button type="button" className="btn-icon" aria-label="Close research detail" onClick={onClose}><X size={20}/></button></header>
      {opp && <p>{opp.title}</p>}
      <p><strong>{theme ? "Theme signal" : "Motive Signal"}: {score ?? "Not available"}{score != null ? "/100" : ""}</strong>. This is not a calibrated win probability.</p>
      {opp && <p>Risk reported by the source: {opp.riskLevel || "Not provided"}.</p>}
      {theme?.timing && <p>Horizon: {theme.timing}</p>}
      {sourceTimestamp && <p className="home-research-muted">Brief generated: {sourceTimestamp}</p>}
      <h3>Reported evidence</h3>
      {(opp?.reasons ?? theme?.supportingFactors ?? []).length ? <ul>{(opp?.reasons ?? theme?.supportingFactors ?? []).map((r, i) => <li key={i}>{r}</li>)}</ul> : <p>No source explanation was included in this brief.</p>}
      {theme && theme.alternatives?.length > 0 && <><h3>Alternative explanations</h3><ul>{theme.alternatives.map((r, i) => <li key={i}>{r}</li>)}</ul></>}
      {theme && <><h3>Related items in this briefing</h3><p>A theme is not a tradable position. Select a specific asset or event before adding it.</p>
        {related.length ? <ul className="home-research-related">{related.map((o) => <li key={o.id}><strong>{o.symbol}</strong><span>{o.module}</span>
          <button type="button" className="btn" onClick={() => onSelect({ type: "opportunity", source: o })}>Review {o.symbol}</button>
          <button type="button" className="btn" disabled={!opportunityKind(o.module)} onClick={() => onSelect({ type: "opportunity", source: o, adding: true })}>Add {o.symbol}</button>
        </li>)}</ul> : <p>No matching asset or event is present in the current briefing. No position has been invented or added.</p>}</>}
      <div className="home-research-actions"><button type="button" className="btn" onClick={ask}>Ask Motive about this</button>
        {opp && <button type="button" className="btn" disabled={!kind} onClick={() => { setAdding(true); setError(null); }}>Add to portfolio</button>}
        {kind && <button type="button" className="btn" onClick={() => { onClose(); onNavigate(opportunityTab(kind)); }}>{saved ? "View saved item" : "Open market"}</button>}</div>
      {opp && !kind && <p role="status">This item has no supported market identity. It cannot be saved as a stock by default.</p>}
      {opp && kind && adding && !saved && <form className="home-save-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <h3>Confirm portfolio entry</h3>
        <p>{kind === "betting" || kind === "predictions" ? "This brief does not include a verified selection or price. Confirm the exact position below. It is recorded with zero stake for tracking, not placed with a provider." : "Track one unit of this asset in your portfolio. Existing holdings are kept unchanged. Adjust quantity and cost in your portfolio after saving; no purchase is executed."}</p>
        {sim && <p>This market is in simulation mode. Its existing simulation rules apply; no real-money bet or trade is executed.</p>}
        {kind === "betting" && <>
          <label>Sport<select required value={draft.sport} onChange={(e) => update("sport", e.target.value)}><option value="">Choose sport</option>{HOME_SPORTS.map((s) => <option key={s} value={s}>{s === "other" ? "Other / unclassified" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select></label>
          <label>Selection<input required maxLength={300} value={draft.pick} onChange={(e) => update("pick", e.target.value)} placeholder="Exact team or outcome"/></label>
          <label>Recorded odds (optional)<input maxLength={40} value={draft.odds} onChange={(e) => update("odds", e.target.value)}/></label>
          <label>Sportsbook (optional)<input maxLength={100} value={draft.sportsbook} onChange={(e) => update("sportsbook", e.target.value)}/></label>
        </>}
        {kind === "predictions" && <>
          <label>Full market question<input required maxLength={1000} value={marketQuestion} onChange={(e) => setMarketQuestion(e.target.value)} placeholder={opp.symbol}/></label>
          <p>The briefing may shorten this title. Copy the complete question from the market before saving.</p>
          <label>Category<select required value={draft.category} onChange={(e) => update("category", e.target.value)}><option value="">Choose category</option>{HOME_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}</select></label>
          <label>Selected outcome<select required value={draft.pick} onChange={(e) => update("pick", e.target.value)}><option value="">Choose outcome</option><option value="Yes">Yes</option><option value="No">No</option></select></label>
          <label>Market YES price in cents<input required type="number" inputMode="decimal" min="0" max="100" step="any" value={draft.yesCents} onChange={(e) => update("yesCents", e.target.value)}/></label>
          <p>Use the market's YES quote, even for a NO position. Do not enter a Motive Signal as a price.</p>
        </>}
        {!owner ? <button type="button" className="btn v2-primary" onClick={() => openAuth("login")}>Sign in to save</button> : <button type="submit" className="btn v2-primary" disabled={saving || !hasModule(kind)}>{saving ? "Saving…" : "Confirm add to portfolio"}</button>}
        {owner && !hasModule(kind) && <p>Access to this market is not currently confirmed. No save request will be sent.</p>}
      </form>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {saved && <p role="status">The server confirmed this portfolio entry. Open the market to review it.</p>}
    </section>
  </div>, document.body);
}
