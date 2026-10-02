import { useCallback, useEffect, useRef, useState } from "react";
import { Briefcase, Pencil, Plus, Star, Trash2, Wand2, X } from "lucide-react";
import { apiGet, apiPost } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useModules } from "../hooks/useModules";
import type { BrandModuleId } from "../brand/moduleBrand";
import { useApi } from "../hooks/useApi";
import type { AdvisorResult, HomeBriefing } from "../types";
import { buildAssetDeepDive, type AssetDeepDivePayload } from "../utils/assetDeepDive";
import { validateSymbolForModule } from "../utils/symbolUniverse";
import { AssetDeepDiveModal } from "./AssetDeepDiveModal";
import { TerminalRow } from "./TerminalRow";
import { useWatchlist } from "../hooks/useWatchlist";

interface Holding { symbol: string; shares?: number; amount?: number; avg_cost?: number; }
type Books = { activeId: string; books: Array<{ id: string; name: string }> };
type Market = "trades" | "crypto" | "penny";
const BRANDS: Record<Market, BrandModuleId> = { trades: "trades", crypto: "crypto", penny: "pinkslips" };
interface Props {
  module: Market; onAnalyzed: (data: AdvisorResult) => void;
  analyzing: boolean; setAnalyzing: (v: boolean) => void; onHoldingsChange?: (count: number) => void;
}
function parseHoldings(value: unknown): Holding[] {
  if (!Array.isArray(value) || value.some((h) => !h || typeof h !== "object" || typeof h.symbol !== "string")) throw new Error("Invalid holdings response");
  return value as Holding[];
}
export function PortfolioPanel({ module, onAnalyzed, analyzing, setAnalyzing, onHoldingsChange }: Props) {
  const { isAuthenticated, user, openAuth } = useAuth();
  const userId = isAuthenticated ? user?.userId : undefined;
  const { hasFeature } = useModules();
  const canMulti = hasFeature("multiple_portfolios");
  const [symbol, setSymbol] = useState("");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [books, setBooks] = useState<Books | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [deepDive, setDeepDive] = useState<AssetDeepDivePayload | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [starring, setStarring] = useState<string | null>(null);
  const writeLock = useRef(false);
  const generation = useRef(0);
  const currentOwner = useRef("");
  const countRef = useRef(onHoldingsChange);
  countRef.current = onHoldingsChange;
  const { items: watchlistItems, addItem: addToWatchlist } = useWatchlist();
  const { data: briefing } = useApi<HomeBriefing>(loaded ? "/home/briefing" : "", 120_000);
  const path = `/advisor/${module}/portfolio`;
  const readPath = `${path}/${encodeURIComponent(userId ?? "")}`;
  const owner = `${userId ?? "guest"}:${module}`;
  const safeToWrite = Boolean(userId && loaded && !loading && !loadError && !busy && currentOwner.current === owner);

  const reload = useCallback(async () => {
    const seq = ++generation.current;
    if (!userId) { setHoldings([]); setLoaded(false); setLoading(false); return false; }
    setLoading(true); setLoadError(null);
    try {
      const payload = await apiGet<{holdings:unknown}>(readPath);
      const rows = parseHoldings(payload.holdings);
      if (seq !== generation.current) return false;
      setHoldings(rows); setLoaded(true); countRef.current?.(rows.length);
      return true;
    } catch {
      if (seq === generation.current) setLoadError("Your saved holdings could not be loaded. Nothing was deleted. Edits are paused until the ledger is verified.");
      return false;
    } finally { if (seq === generation.current) setLoading(false); }
  }, [userId, readPath]);
  useEffect(() => {
    currentOwner.current = owner;
    setHoldings([]); setLoaded(false); setBooks(null); setDeepDive(null); setEditingIndex(null); setFormError(null);
    void reload();
    const changed = (e: Event) => { if ((e as CustomEvent<{kind?:string}>).detail?.kind === module && !writeLock.current) void reload(); };
    window.addEventListener("motivefx:portfolio-changed", changed);
    return () => { generation.current += 1; currentOwner.current = ""; window.removeEventListener("motivefx:portfolio-changed", changed); };
  }, [owner, module, reload]);

  const loadBooks = useCallback(async () => {
    if (!userId || !canMulti) { setBooks(null); return; }
    const target = owner;
    try {
      const result = await apiGet<{books:Books}>(`/terminal/portfolio/books?module=${module}`);
      if (currentOwner.current === target) { setBooks(result.books); setBookError(null); }
    } catch { if (currentOwner.current === target) setBookError("Named portfolios are temporarily unavailable. The current saved ledger is shown below."); }
  }, [userId, canMulti, owner, module]);
  useEffect(() => { if (loaded) void loadBooks(); }, [loaded, loadBooks]);
  function notify() {
    window.dispatchEvent(new Event("motivefx:briefing-refresh"));
    window.dispatchEvent(new CustomEvent("motivefx:portfolio-changed", { detail: { kind: module } }));
  }
  function resetForm() { setSymbol(""); setQty(""); setCost(""); setEditingIndex(null); setFormError(null); }
  async function persist(next: Holding[]) {
    if (!safeToWrite || writeLock.current) throw new Error("Wait for the saved ledger to load successfully before editing holdings.");
    writeLock.current = true; setBusy(true); setFormError(null);
    const target = owner;
    generation.current += 1;
    try {
      // Do not overwrite an external Add or another browser's update using an older list.
      const actual = await apiGet<{holdings:unknown}>(readPath);
      const latest = parseHoldings(actual.holdings);
      if (JSON.stringify(latest) !== JSON.stringify(holdings)) {
        if (currentOwner.current === target) { setHoldings(latest); countRef.current?.(latest.length); }
        throw new Error("Your portfolio changed elsewhere. The latest holdings are now shown; review them before retrying.");
      }
      await apiPost(path, { user_id: userId, holdings: next });
      if (currentOwner.current !== target) return;
      setHoldings(next); countRef.current?.(next.length); notify();
    } finally { writeLock.current = false; if (currentOwner.current === target) setBusy(false); }
  }
  async function saveHolding() {
    if (!userId) { openAuth("login"); return; }
    if (!safeToWrite || !symbol.trim() || !qty.trim()) return;
    const amount = Number(qty), average = cost.trim() ? Number(cost) : undefined;
    if (!Number.isFinite(amount) || amount <= 0 || (average !== undefined && (!Number.isFinite(average) || average < 0))) { setFormError("Enter a positive quantity and a valid non-negative average cost."); return; }
    if (module !== "crypto") { const invalid = validateSymbolForModule(symbol, module); if (invalid) { setFormError(invalid); return; } }
    const holding: Holding = { symbol: symbol.trim().toUpperCase(), ...(average !== undefined ? {avg_cost:average} : {}), ...(module === "crypto" ? {amount} : {shares:amount}) };
    try { await persist(editingIndex == null ? [...holdings, holding] : holdings.map((h,i) => i === editingIndex ? holding : h)); resetForm(); }
    catch (e) { setFormError(e instanceof Error ? e.message : "Could not save the holding."); }
  }
  async function removeHolding(index: number) {
    if (!safeToWrite) return;
    try { await persist(holdings.filter((_,i) => i !== index)); resetForm(); setDeepDive(null); setSelectedSymbol(null); }
    catch (e) { setFormError(e instanceof Error ? e.message : "Could not remove the holding. It remains saved."); }
  }
  function editHolding(index: number) {
    if (!safeToWrite) return;
    const h = holdings[index]; if (!h) return;
    setSymbol(h.symbol); setQty(String(module === "crypto" ? h.amount ?? "" : h.shares ?? "")); setCost(h.avg_cost != null ? String(h.avg_cost) : ""); setEditingIndex(index); setFormError(null);
  }
  async function starHolding(h: Holding) {
    if (!userId) return;
    setStarring(h.symbol);
    try { await addToWatchlist(module, h.symbol); }
    catch (e) { setFormError(e instanceof Error ? e.message : "Could not add to Radar."); }
    finally { setStarring(null); }
  }
  function openHolding(h: Holding) {
    setSelectedSymbol(h.symbol);
    const match = briefing?.opportunities?.find((o) => o.symbol.toUpperCase() === h.symbol.toUpperCase());
    setDeepDive(buildAssetDeepDive({ symbol:h.symbol, shares:h.shares, amount:h.amount, price:h.avg_cost,
      note: match?.reasons?.join(" ") || "Saved holding. Average cost is not a current market quote.", id:`holding-${h.symbol}` }, BRANDS[module]));
  }
  async function bookAction(action: "switch" | "create", bookId?: string) {
    if (!safeToWrite || writeLock.current || (action === "switch" && (!bookId || bookId === books?.activeId))) return;
    writeLock.current = true; setBusy(true); setFormError(null);
    try {
      const result = await apiPost<{books:Books}>("/terminal/portfolio/books", {action,module,bookId,...(action === "create" ? {name:`Portfolio ${(books?.books.length ?? 0)+1}`} : {})});
      setBooks(result.books); setLoaded(false); await reload(); notify();
    } catch (e) { setFormError(e instanceof Error ? e.message : "Could not switch portfolio."); }
    finally { writeLock.current = false; setBusy(false); }
  }
  async function analyze() {
    if (!safeToWrite || !holdings.length) return;
    setAnalyzing(true); setFormError(null);
    try { onAnalyzed(await apiPost<AdvisorResult>(`/advisor/${module}/analyze`, {user_id:userId,holdings})); }
    catch (e) { setFormError(e instanceof Error ? e.message : "Analysis is temporarily unavailable."); }
    finally { setAnalyzing(false); }
  }
  return <>
    <AssetDeepDiveModal payload={deepDive} module={BRANDS[module]} onClose={() => { setDeepDive(null); setSelectedSymbol(null); }} />
    <section className="card glass-card portfolio-ledger">
      <header className="card-header card-header-bold"><h2 className="card-title card-title-lg"><Briefcase size={18} /> Holdings Ledger</h2>
        <button type="button" className="btn btn-accent-terminal btn-sm" onClick={() => void analyze()} disabled={analyzing || !safeToWrite || !holdings.length}><Wand2 size={12}/>{analyzing ? "Analyzing…" : "AI Analyze"}</button>
      </header>
      <div style={{padding:".75rem 1rem"}}><button type="button" className="btn btn-ghost btn-sm" disabled={loading || busy} onClick={() => void reload()}>{loading ? "Loading saved holdings…" : "Refresh saved holdings"}</button></div>
      {loadError && <div className="portfolio-form-error" role="alert">{loadError}<button type="button" className="btn btn-ghost btn-sm" onClick={() => void reload()}>Retry holdings</button></div>}
      {bookError && <p className="ledger-hint">{bookError}<button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadBooks()}>Retry portfolios</button></p>}
      {canMulti && books && <div className="phase2-sim-row" style={{padding:".65rem .85rem 0"}}><label className="phase2-field" style={{flex:1}}><span>Active portfolio</span><select aria-label="Active portfolio" value={books.activeId} disabled={!safeToWrite} onChange={(e) => void bookAction("switch",e.target.value)}>{books.books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <button type="button" className="btn btn-ghost btn-sm" disabled={!safeToWrite || books.books.length >= 5} onClick={() => void bookAction("create")}><Plus size={14}/> New</button></div>}
      <div className="portfolio-form portfolio-form-terminal portfolio-form-ledger">
        <input className="pf-span-4" aria-label="Holding symbol" placeholder={module === "crypto" ? "Symbol (BTC, ETH)" : module === "penny" ? "Pink Sheet symbol" : "Stock symbol"} value={symbol} onChange={(e)=>setSymbol(e.target.value)} onKeyDown={(e)=>{if(e.key === "Enter") void saveHolding();}} />
        <input className="pf-span-4" type="number" step="any" min="0" aria-label="Holding quantity" placeholder={module === "crypto" ? "Amount" : "Shares"} value={qty} onChange={(e)=>setQty(e.target.value)} onKeyDown={(e)=>{if(e.key === "Enter") void saveHolding();}} />
        <input className="pf-span-4" type="number" step="any" min="0" aria-label="Holding average cost" placeholder="Avg cost (optional)" value={cost} onChange={(e)=>setCost(e.target.value)} onKeyDown={(e)=>{if(e.key === "Enter") void saveHolding();}} />
        <button className="btn btn-form-add pf-span-12" type="button" disabled={!safeToWrite || !symbol.trim() || !qty.trim()} onClick={()=>void saveHolding()}>{busy ? "Saving…" : editingIndex == null ? "+ Add holding" : "Save changes"}</button>
        {editingIndex != null && <button className="btn btn-ghost btn-sm pf-span-12" type="button" onClick={resetForm}><X size={12}/> Cancel edit</button>}
      </div>
      {formError && <p className="portfolio-form-error" role="alert">{formError}</p>}
      <div className="card-body flush terminal-feed">
        {!userId ? <div className="empty">Sign in to see saved holdings.</div> : !loaded && loading ? <div className="loading" role="status">Loading your saved ledger…</div> : !loaded && loadError ? null : loaded && !holdings.length ? <div className="empty">This saved portfolio has no holdings. Choose another named portfolio or add a holding.</div> : <>
          <p className="ledger-hint">Tap a holding for details · pencil to edit · trash to remove</p>
          {holdings.map((h,i) => <TerminalRow key={`${h.symbol}-${i}`} tag={{label:"HOLDING",variant:"neutral"}} primary={`$${h.symbol}`} secondary={`${module === "crypto" ? `${h.amount} units` : `${h.shares} shares`}${h.avg_cost != null ? ` · avg $${h.avg_cost}` : ""}`} selected={selectedSymbol === h.symbol} onClick={()=>openHolding(h)} actions={<>
            <button type="button" className="btn-icon" aria-label={`Edit ${h.symbol}`} disabled={!safeToWrite || editingIndex === i} onClick={(e)=>{e.stopPropagation();editHolding(i);}}><Pencil size={14}/></button>
            <button type="button" className="btn-icon" aria-label={`Add ${h.symbol} to radar`} disabled={starring === h.symbol || watchlistItems.some((w)=>w.module===module && w.symbol===h.symbol)} onClick={(e)=>{e.stopPropagation();void starHolding(h);}}><Star size={14}/></button>
            <button type="button" className="btn-icon btn-icon-danger" aria-label={`Remove ${h.symbol}`} disabled={!safeToWrite} onClick={(e)=>{e.stopPropagation();void removeHolding(i);}}><Trash2 size={14}/></button>
          </>} />)}
        </>}
      </div>
    </section>
  </>;
}
