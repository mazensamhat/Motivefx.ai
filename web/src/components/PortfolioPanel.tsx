import { useEffect, useRef, useState } from "react";
import { Briefcase, Pencil, Plus, Star, Trash2, Wand2, X } from "lucide-react";
import { apiGet, apiPost } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useModules } from "../hooks/useModules";
import { useSavedRows } from "../hooks/useSavedRows";
import type { BrandModuleId } from "../brand/moduleBrand";
import { useApi } from "../hooks/useApi";
import type { AdvisorResult, HomeBriefing } from "../types";
import type { AssetDeepDivePayload } from "../utils/assetDeepDive";
import { buildAssetDeepDive } from "../utils/assetDeepDive";
import { validateSymbolForModule } from "../utils/symbolUniverse";
import { AssetDeepDiveModal } from "./AssetDeepDiveModal";
import { TerminalRow } from "./TerminalRow";
import { useWatchlist } from "../hooks/useWatchlist";

interface Holding { symbol: string; shares?: number; amount?: number; avg_cost?: number; }
type PortfolioBookMeta = { activeId: string; books: Array<{ id: string; name: string }> };
const MODULE_TO_BRAND: Record<"trades" | "crypto" | "penny", BrandModuleId> = {
  trades: "trades", crypto: "crypto", penny: "pinkslips",
};
interface Props {
  module: "trades" | "crypto" | "penny";
  onAnalyzed: (data: AdvisorResult) => void; analyzing: boolean;
  setAnalyzing: (v: boolean) => void; onHoldingsChange?: (count: number) => void;
}
export function PortfolioPanel({ module, onAnalyzed, analyzing, setAnalyzing, onHoldingsChange }: Props) {
  const { isAuthenticated, user } = useAuth();
  const { hasFeature } = useModules();
  const canMulti = hasFeature("multiple_portfolios");
  const [symbol, setSymbol] = useState("");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const owner = isAuthenticated ? user?.userId ?? "" : "";
  const ledger = useSavedRows<Holding>(owner ? `/advisor/${module}/portfolio/${owner}` : "", "holdings", owner, module);
  const { rows: holdings, setRows: setHoldings } = ledger;
  const [writeBusy, setWriteBusy] = useState(false);
  const writeLock = useRef(false);
  const [books, setBooks] = useState<PortfolioBookMeta | null>(null);
  const [bookBusy, setBookBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [deepDive, setDeepDive] = useState<AssetDeepDivePayload | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [starring, setStarring] = useState<string | null>(null);
  const { items: watchlistItems, addItem: addToWatchlist } = useWatchlist();
  const { data: briefing } = useApi<HomeBriefing>("/home/briefing", 120_000);
  const qtyLabel = module === "crypto" ? "Amount" : "Shares";
  const brandModule = MODULE_TO_BRAND[module];
  const onHoldingsChangeRef = useRef(onHoldingsChange);
  onHoldingsChangeRef.current = onHoldingsChange;
  const ownerRef = useRef(owner); ownerRef.current = owner;

  async function persistHoldings(next: Holding[], rollback: Holding[]) {
    if (!ledger.writable || writeLock.current) throw new Error("Load your saved portfolio successfully before changing holdings.");
    writeLock.current = true; setWriteBusy(true);
    setHoldings(next);
    try {
      await apiPost(`/advisor/${module}/portfolio`, { user_id: owner, holdings: next });
      if (ownerRef.current !== owner) return;
      window.dispatchEvent(new Event("motivefx:briefing-refresh"));
      window.dispatchEvent(new CustomEvent("motivefx:portfolio-changed", { detail: { kind: module } }));
    } catch (e) {
      if (ownerRef.current === owner) setHoldings(rollback);
      throw e;
    } finally { writeLock.current = false; setWriteBusy(false); }
  }
  useEffect(() => { if (ledger.verified) onHoldingsChangeRef.current?.(holdings.length); }, [ledger.verified, holdings.length]);
  useEffect(() => {
    setBooks(null); setDeepDive(null); setSelectedSymbol(null); setEditingIndex(null);
    if (!owner || !canMulti) return;
    let cancelled = false;
    apiGet<{ books: PortfolioBookMeta }>(`/terminal/portfolio/books?module=${module}`)
      .then((d) => { if (!cancelled) setBooks(d.books); })
      .catch(() => { if (!cancelled) setBooks(null); });
    return () => { cancelled = true; };
  }, [module, owner, canMulti]);
  async function reloadHoldings() {
    const list = await ledger.reload();
    if (list === null) throw new Error("Portfolio saved, but its latest contents could not be loaded. Retry before making another change.");
  }
  async function switchBook(bookId: string) {
    if (!ledger.writable || !bookId || bookId === books?.activeId) return;
    setBookBusy(true); setFormError(null);
    try {
      const res = await apiPost<{ books: PortfolioBookMeta }>("/terminal/portfolio/books", { action: "switch", module, bookId });
      setBooks(res.books); await reloadHoldings();
      window.dispatchEvent(new Event("motivefx:briefing-refresh"));
    } catch (e) { setFormError(e instanceof Error ? e.message : "Could not switch portfolio"); }
    finally { setBookBusy(false); }
  }
  async function createBook() {
    if (!ledger.writable) return;
    setBookBusy(true); setFormError(null);
    try {
      const res = await apiPost<{ books: PortfolioBookMeta }>("/terminal/portfolio/books", { action: "create", module, name: `Portfolio ${(books?.books.length ?? 0) + 1}` });
      setBooks(res.books); await reloadHoldings();
      window.dispatchEvent(new Event("motivefx:briefing-refresh"));
    } catch (e) { setFormError(e instanceof Error ? e.message : "Could not create portfolio"); }
    finally { setBookBusy(false); }
  }
  function resetForm() { setSymbol(""); setQty(""); setCost(""); setEditingIndex(null); setFormError(null); }
  function startEdit(index: number) {
    const h = holdings[index]; if (!h) return;
    setEditingIndex(index); setSymbol(h.symbol);
    setQty(String(module === "crypto" ? h.amount ?? "" : h.shares ?? ""));
    setCost(h.avg_cost != null ? String(h.avg_cost) : ""); setFormError(null);
  }
  async function addHolding() {
    if (!isAuthenticated || !symbol || !qty) return;
    if (module !== "crypto") {
      const localError = validateSymbolForModule(symbol, module);
      if (localError) { setFormError(localError); return; }
    }
    const quantity = Number(qty), average = cost ? Number(cost) : undefined;
    if (!Number.isFinite(quantity) || quantity <= 0 || (average !== undefined && (!Number.isFinite(average) || average < 0))) {
      setFormError("Enter a positive quantity and a valid non-negative average cost."); return;
    }
    const h: Holding = { symbol: symbol.trim().toUpperCase(), avg_cost: average };
    if (module === "crypto") h.amount = quantity; else h.shares = quantity;
    setFormError(null);
    try {
      const next = editingIndex != null ? holdings.map((row, i) => i === editingIndex ? h : row) : [...holdings, h];
      await persistHoldings(next, holdings); resetForm();
    } catch (e) { setFormError(e instanceof Error ? e.message : "Could not save holding"); }
  }
  async function starHolding(h: Holding) {
    if (!isAuthenticated || watchlistItems.some((w) => w.module === module && w.symbol === h.symbol)) return;
    setStarring(h.symbol);
    try { await addToWatchlist(module, h.symbol); }
    catch (e) { setFormError(e instanceof Error ? e.message : "Could not add to radar"); }
    finally { setStarring(null); }
  }
  async function removeHolding(index: number) {
    if (!isAuthenticated) return;
    const sym = holdings[index]?.symbol; if (!sym) return;
    setRemoving(sym);
    try {
      await persistHoldings(holdings.filter((_, i) => i !== index), holdings);
      if (selectedSymbol === sym) { setSelectedSymbol(null); setDeepDive(null); }
      if (editingIndex === index) resetForm();
    } catch (e) { setFormError(e instanceof Error ? e.message : "Could not remove holding"); }
    finally { setRemoving(null); }
  }
  function openHoldingDetail(h: Holding) {
    setSelectedSymbol(h.symbol);
    const sym = h.symbol.toUpperCase();
    const match = briefing?.opportunities?.find((o) => o.symbol.toUpperCase() === sym || o.symbol.toUpperCase().includes(sym));
    const note = match?.reasons?.filter(Boolean).join(" ") ?? "";
    setDeepDive(buildAssetDeepDive({ symbol: h.symbol, shares: h.shares, amount: h.amount, price: h.avg_cost,
      side: match?.stance?.includes("avoid") || match?.stance?.includes("sell") ? "sell" : "buy",
      type: match?.signals?.some((s) => /put/i.test(s)) ? "put" : match?.signals?.some((s) => /call/i.test(s)) ? "call" : undefined,
      note: note || undefined, briefingNote: note || undefined, timestamp: new Date().toISOString(), id: `holding-${sym}` }, brandModule));
  }
  async function analyze() {
    if (!ledger.writable) return;
    setAnalyzing(true); setFormError(null);
    try { onAnalyzed(await apiPost<AdvisorResult>(`/advisor/${module}/analyze`, { user_id: owner, holdings })); }
    catch (e) { setFormError(e instanceof Error ? e.message : "Analysis failed"); }
    finally { setAnalyzing(false); }
  }
  return <>
    <AssetDeepDiveModal payload={deepDive} module={brandModule} onClose={() => { setDeepDive(null); setSelectedSymbol(null); }} />
    <div className="card glass-card portfolio-ledger">
      <div className="card-header card-header-bold"><h2 className="card-title card-title-lg"><Briefcase size={18} /> Holdings Ledger</h2>
        <button className="btn btn-accent-terminal btn-sm" onClick={analyze} disabled={analyzing || !ledger.writable || !holdings.length}><Wand2 size={12} />{analyzing ? "Analyzing…" : "AI Analyze"}</button>
      </div>
      {canMulti && books && <div className="phase2-sim-row" style={{ padding: "0.65rem 0.85rem 0" }}>
        <label className="phase2-field" style={{ flex: 1 }}><span>Active portfolio</span>
          <select value={books.activeId} disabled={bookBusy || !ledger.writable || writeBusy} onChange={(e) => void switchBook(e.target.value)}>
            {books.books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-sm btn-ghost" disabled={bookBusy || !ledger.writable || writeBusy || books.books.length >= 5} onClick={() => void createBook()} title="Create another named ledger (Ultra+)"><Plus size={14} /> New</button>
      </div>}
      <div className="portfolio-form portfolio-form-terminal portfolio-form-ledger">
        <input className="pf-span-4" placeholder={module === "penny" ? "Pink slip only (SNDL, AMC…)" : module === "trades" ? "Large cap / flow (AAPL, NVDA…)" : "Symbol (BTC, ETH)"}
          value={symbol} onChange={(e) => { setSymbol(e.target.value); if (formError) setFormError(null); }} onKeyDown={(e) => { if (e.key === "Enter") void addHolding(); }} />
        <input className="pf-span-4" placeholder={qtyLabel} value={qty} onChange={(e) => setQty(e.target.value)} type="number" step="any" onKeyDown={(e) => { if (e.key === "Enter") void addHolding(); }} />
        <input className="pf-span-4" placeholder="Avg cost (optional)" value={cost} onChange={(e) => setCost(e.target.value)} type="number" step="any" onKeyDown={(e) => { if (e.key === "Enter") void addHolding(); }} />
        <button className="btn btn-form-add pf-span-12" type="button" onClick={addHolding} disabled={!symbol || !qty || !ledger.writable || writeBusy}>{editingIndex != null ? "Save changes" : "+ Add holding"}</button>
        {editingIndex != null && <button className="btn btn-ghost btn-sm pf-span-12" type="button" onClick={resetForm}><X size={12} /> Cancel edit</button>}
      </div>
      {formError && <div className="portfolio-form-error">{formError}</div>}
      {ledger.error && <div className="portfolio-form-error" role="alert">Could not load saved holdings. {ledger.error} {holdings.length > 0 ? "Showing the last successful read." : "This is not an empty-portfolio result."} <button type="button" className="btn" onClick={() => void ledger.reload()}>Retry holdings</button></div>}
      {ledger.loading && <div className="loading" role="status">Loading saved holdings…</div>}
      <div className="card-body flush terminal-feed">
        {holdings.length === 0 && ledger.verified && !ledger.error && !ledger.loading ? <div className="empty">Type a symbol and shares, then add to your live ledger.</div> : <>
          {holdings.length > 0 && <p className="ledger-hint">Tap a holding for details · pencil to edit · trash to remove</p>}
          {holdings.map((h, i) => <TerminalRow key={`${h.symbol}-${i}`} tag={{ label: "HOLDING", variant: "neutral" }} primary={`$${h.symbol}`}
            secondary={<>{module === "crypto" ? `${h.amount} units` : `${h.shares} shares`}{h.avg_cost != null ? ` · avg $${h.avg_cost}` : ""}</>}
            selected={selectedSymbol === h.symbol} onClick={() => openHoldingDetail(h)} actions={<>
              <button type="button" className="btn-icon" aria-label={`Edit ${h.symbol}`} disabled={editingIndex === i || !ledger.writable || writeBusy} onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(i); }}><Pencil size={14} /></button>
              <button type="button" className={`btn-icon ${watchlistItems.some((w) => w.module === module && w.symbol === h.symbol) ? "btn-icon-starred" : ""}`} aria-label={`Add ${h.symbol} to radar`}
                disabled={starring === h.symbol || watchlistItems.some((w) => w.module === module && w.symbol === h.symbol)} onClick={(e) => { e.preventDefault(); e.stopPropagation(); void starHolding(h); }}><Star size={14} /></button>
              <button type="button" className="btn-icon btn-icon-danger" aria-label={`Remove ${h.symbol}`} disabled={removing === h.symbol || !ledger.writable || writeBusy} onClick={(e) => { e.preventDefault(); e.stopPropagation(); void removeHolding(i); }}><Trash2 size={14} /></button>
            </>} />)}
        </>}
      </div>
    </div>
  </>;
}
