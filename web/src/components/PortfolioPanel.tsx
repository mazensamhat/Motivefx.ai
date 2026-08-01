import { useEffect, useRef, useState } from "react";
import { Briefcase, Pencil, Plus, Star, Trash2, Wand2, X } from "lucide-react";
import { apiGet, apiPost, getUserId } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useModules } from "../hooks/useModules";
import type { BrandModuleId } from "../brand/moduleBrand";
import { useApi } from "../hooks/useApi";
import type { AdvisorResult, HomeBriefing } from "../types";
import type { AssetDeepDivePayload } from "../utils/assetDeepDive";
import { buildAssetDeepDive } from "../utils/assetDeepDive";
import { validateSymbolForModule } from "../utils/symbolUniverse";
import { AssetDeepDiveModal } from "./AssetDeepDiveModal";
import { TerminalRow } from "./TerminalRow";
import { useWatchlist } from "../hooks/useWatchlist";

interface Holding {
  symbol: string;
  shares?: number;
  amount?: number;
  avg_cost?: number;
}

type PortfolioBookMeta = {
  activeId: string;
  books: Array<{ id: string; name: string }>;
};

const MODULE_TO_BRAND: Record<"trades" | "crypto" | "penny", BrandModuleId> = {
  trades: "trades",
  crypto: "crypto",
  penny: "pinkslips",
};

interface Props {
  module: "trades" | "crypto" | "penny";
  onAnalyzed: (data: AdvisorResult) => void;
  analyzing: boolean;
  setAnalyzing: (v: boolean) => void;
  onHoldingsChange?: (count: number) => void;
}

export function PortfolioPanel({ module, onAnalyzed, analyzing, setAnalyzing, onHoldingsChange }: Props) {
  const { isAuthenticated, user } = useAuth();
  const { hasFeature } = useModules();
  const canMulti = hasFeature("multiple_portfolios");
  const [symbol, setSymbol] = useState("");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [holdings, setHoldings] = useState<Holding[]>([]);
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
  const localWriteEpoch = useRef(0);
  const onHoldingsChangeRef = useRef(onHoldingsChange);
  onHoldingsChangeRef.current = onHoldingsChange;

  const savePaths: Record<string, string> = {
    trades: "/advisor/trades/portfolio",
    crypto: "/advisor/crypto/portfolio",
    penny: "/advisor/penny/portfolio",
  };

  async function persistHoldings(next: Holding[], rollback?: Holding[]) {
    ++localWriteEpoch.current;
    setHoldings(next);
    onHoldingsChangeRef.current?.(next.length);
    try {
      await apiPost(savePaths[module], { user_id: user?.userId ?? getUserId(), holdings: next });
      window.dispatchEvent(new Event("motivefx:briefing-refresh"));
    } catch (e) {
      localWriteEpoch.current++;
      const restore = rollback ?? next;
      setHoldings(restore);
      onHoldingsChangeRef.current?.(restore.length);
      throw e;
    }
  }

  useEffect(() => {
    const fetchEpoch = localWriteEpoch.current;
    let cancelled = false;

    function applyHoldings(list: Holding[]) {
      if (cancelled || localWriteEpoch.current !== fetchEpoch) return;
      setHoldings(list);
      onHoldingsChangeRef.current?.(list.length);
    }

    if (!isAuthenticated) {
      applyHoldings([]);
      return () => {
        cancelled = true;
      };
    }

    const userId = user?.userId ?? getUserId();
    const paths: Record<string, string> = {
      trades: `/advisor/trades/portfolio/${userId}`,
      crypto: `/advisor/crypto/portfolio/${userId}`,
      penny: `/advisor/penny/portfolio/${userId}`,
    };

    apiGet<{ holdings: Holding[] }>(paths[module])
      .then((d) => applyHoldings(d.holdings ?? []))
      .catch(() => applyHoldings([]));

    const onAuth = () => {
      const authFetchEpoch = localWriteEpoch.current;
      if (!isAuthenticated) {
        localWriteEpoch.current++;
        setHoldings([]);
        onHoldingsChangeRef.current?.(0);
        return;
      }
      apiGet<{ holdings: Holding[] }>(paths[module])
        .then((d) => {
          if (localWriteEpoch.current !== authFetchEpoch) return;
          setHoldings(d.holdings ?? []);
          onHoldingsChangeRef.current?.((d.holdings ?? []).length);
        })
        .catch(() => {
          if (localWriteEpoch.current !== authFetchEpoch) return;
          setHoldings([]);
          onHoldingsChangeRef.current?.(0);
        });
    };
    window.addEventListener("motivefx:auth-changed", onAuth);
    return () => {
      cancelled = true;
      window.removeEventListener("motivefx:auth-changed", onAuth);
    };
  }, [module, isAuthenticated, user?.userId]);

  useEffect(() => {
    if (!isAuthenticated || !canMulti) {
      setBooks(null);
      return;
    }
    let cancelled = false;
    apiGet<{ books: PortfolioBookMeta }>(`/terminal/portfolio/books?module=${module}`)
      .then((d) => {
        if (!cancelled) setBooks(d.books);
      })
      .catch(() => {
        if (!cancelled) setBooks(null);
      });
    return () => {
      cancelled = true;
    };
  }, [module, isAuthenticated, canMulti]);

  async function reloadHoldings() {
    const userId = user?.userId ?? getUserId();
    const paths: Record<string, string> = {
      trades: `/advisor/trades/portfolio/${userId}`,
      crypto: `/advisor/crypto/portfolio/${userId}`,
      penny: `/advisor/penny/portfolio/${userId}`,
    };
    const d = await apiGet<{ holdings: Holding[] }>(paths[module]);
    setHoldings(d.holdings ?? []);
    onHoldingsChangeRef.current?.((d.holdings ?? []).length);
  }

  async function switchBook(bookId: string) {
    if (!bookId || bookId === books?.activeId) return;
    setBookBusy(true);
    setFormError(null);
    try {
      const res = await apiPost<{ books: PortfolioBookMeta }>("/terminal/portfolio/books", {
        action: "switch",
        module,
        bookId,
      });
      setBooks(res.books);
      await reloadHoldings();
      window.dispatchEvent(new Event("motivefx:briefing-refresh"));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not switch portfolio");
    } finally {
      setBookBusy(false);
    }
  }

  async function createBook() {
    setBookBusy(true);
    setFormError(null);
    try {
      const res = await apiPost<{ books: PortfolioBookMeta }>("/terminal/portfolio/books", {
        action: "create",
        module,
        name: `Portfolio ${(books?.books.length ?? 0) + 1}`,
      });
      setBooks(res.books);
      await reloadHoldings();
      window.dispatchEvent(new Event("motivefx:briefing-refresh"));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not create portfolio");
    } finally {
      setBookBusy(false);
    }
  }

  function resetForm() {
    setSymbol("");
    setQty("");
    setCost("");
    setEditingIndex(null);
    setFormError(null);
  }

  function startEdit(index: number) {
    const holding = holdings[index];
    if (!holding) return;
    setEditingIndex(index);
    setSymbol(holding.symbol);
    setQty(String(module === "crypto" ? holding.amount ?? "" : holding.shares ?? ""));
    setCost(holding.avg_cost != null ? String(holding.avg_cost) : "");
    setFormError(null);
  }

  async function saveHolding() {
    if (!isAuthenticated) return;
    if (!symbol || !qty) return;

    if (module === "trades" || module === "penny") {
      const localErr = validateSymbolForModule(symbol, module);
      if (localErr) {
        setFormError(localErr);
        return;
      }
    }

    const h: Holding = {
      symbol: symbol.toUpperCase(),
      avg_cost: cost ? parseFloat(cost) : undefined,
    };
    if (module === "crypto") h.amount = parseFloat(qty);
    else h.shares = parseFloat(qty);

    setFormError(null);
    try {
      const next =
        editingIndex != null
          ? holdings.map((row, i) => (i === editingIndex ? h : row))
          : [...holdings, h];
      await persistHoldings(next, holdings);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save holding");
      return;
    }

    resetForm();
  }

  async function addHolding() {
    await saveHolding();
  }

  async function starHolding(h: Holding) {
    if (!isAuthenticated) return;
    const sym = h.symbol;
    const onRadar = watchlistItems.some((w) => w.module === module && w.symbol === sym);
    if (onRadar) return;
    setStarring(sym);
    try {
      await addToWatchlist(module, sym);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not add to radar");
    } finally {
      setStarring(null);
    }
  }

  async function removeHolding(index: number) {
    if (!isAuthenticated) return;
    const sym = holdings[index]?.symbol;
    if (!sym) return;
    setRemoving(sym);
    const prev = holdings;
    try {
      const next = prev.filter((_, i) => i !== index);
      await persistHoldings(next, prev);
      if (selectedSymbol === sym) {
        setSelectedSymbol(null);
        setDeepDive(null);
      }
      if (editingIndex === index) resetForm();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not remove holding");
    } finally {
      setRemoving(null);
    }
  }

  function openHoldingDetail(h: Holding) {
    setSelectedSymbol(h.symbol);
    const sym = h.symbol.toUpperCase();
    const match = briefing?.opportunities?.find(
      (o) => o.symbol.toUpperCase() === sym || o.symbol.toUpperCase().includes(sym)
    );
    const briefingNote = match?.reasons?.filter(Boolean).join(" ") ?? "";
    setDeepDive(
      buildAssetDeepDive(
        {
          symbol: h.symbol,
          shares: h.shares,
          amount: h.amount,
          price: h.avg_cost,
          side: match?.stance?.includes("avoid") || match?.stance?.includes("sell") ? "sell" : "buy",
          type: match?.signals?.some((s) => /put/i.test(s))
            ? "put"
            : match?.signals?.some((s) => /call/i.test(s))
              ? "call"
              : undefined,
          note: briefingNote || undefined,
          briefingNote: briefingNote || undefined,
          premium: undefined,
          changePct: undefined,
          timestamp: new Date().toISOString(),
          id: `holding-${sym}`,
        },
        brandModule
      )
    );
  }

  async function analyze() {
    setAnalyzing(true);
    setFormError(null);
    try {
      const analyzePaths: Record<string, string> = {
        trades: "/advisor/trades/analyze",
        crypto: "/advisor/crypto/analyze",
        penny: "/advisor/penny/analyze",
      };
      const data = await apiPost<AdvisorResult>(analyzePaths[module], {
        user_id: user?.userId ?? getUserId(),
        holdings,
      });
      onAnalyzed(data);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <>
      <AssetDeepDiveModal
        payload={deepDive}
        module={brandModule}
        onClose={() => {
          setDeepDive(null);
          setSelectedSymbol(null);
        }}
      />

      <div className="card glass-card portfolio-ledger">
        <div className="card-header card-header-bold">
          <h2 className="card-title card-title-lg">
            <Briefcase size={18} /> Holdings Ledger
          </h2>
          <button
            className="btn btn-accent-terminal btn-sm"
            onClick={analyze}
            disabled={analyzing || !holdings.length}
          >
            <Wand2 size={12} />
            {analyzing ? "Analyzing…" : "AI Analyze"}
          </button>
        </div>

        {canMulti && books && (
          <div className="phase2-sim-row" style={{ padding: "0.65rem 0.85rem 0" }}>
            <label className="phase2-field" style={{ flex: 1 }}>
              <span>Active portfolio</span>
              <select
                value={books.activeId}
                disabled={bookBusy}
                onChange={(e) => void switchBook(e.target.value)}
              >
                {books.books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={bookBusy || books.books.length >= 5}
              onClick={() => void createBook()}
              title="Create another named ledger (Ultra+)"
            >
              <Plus size={14} /> New
            </button>
          </div>
        )}

        <div className="portfolio-form portfolio-form-terminal portfolio-form-ledger">
          <input
            className="pf-span-4"
            placeholder={
              module === "penny"
                ? "Pink slip only (SNDL, AMC…)"
                : module === "trades"
                  ? "Large cap / flow (AAPL, NVDA…)"
                  : "Symbol (BTC, ETH)"
            }
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value);
              if (formError) setFormError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && addHolding()}
          />
          <input
            className="pf-span-4"
            placeholder={qtyLabel}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            type="number"
            step="any"
            onKeyDown={(e) => e.key === "Enter" && addHolding()}
          />
          <input
            className="pf-span-4"
            placeholder="Avg cost (optional)"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            type="number"
            step="any"
            onKeyDown={(e) => e.key === "Enter" && addHolding()}
          />
          <button
            className="btn btn-form-add pf-span-12"
            type="button"
            onClick={addHolding}
            disabled={!symbol || !qty}
          >
            {editingIndex != null ? "Save changes" : "+ Add holding"}
          </button>
          {editingIndex != null && (
            <button
              className="btn btn-ghost btn-sm pf-span-12"
              type="button"
              onClick={resetForm}
            >
              <X size={12} /> Cancel edit
            </button>
          )}
        </div>

        {formError && <div className="portfolio-form-error">{formError}</div>}

        <div className="card-body flush terminal-feed">
          {holdings.length === 0 ? (
            <div className="empty">Type a symbol and shares, then add to your live ledger.</div>
          ) : (
            <>
              <p className="ledger-hint">Tap a holding for details · pencil to edit · trash to remove</p>
              {holdings.map((h, i) => (
                <TerminalRow
                  key={`${h.symbol}-${i}`}
                  tag={{ label: "HOLDING", variant: "neutral" }}
                  primary={`$${h.symbol}`}
                  secondary={
                    <>
                      {module === "crypto" ? `${h.amount} units` : `${h.shares} shares`}
                      {h.avg_cost ? ` · avg $${h.avg_cost}` : ""}
                    </>
                  }
                  selected={selectedSymbol === h.symbol}
                  onClick={() => openHoldingDetail(h)}
                  actions={
                    <>
                      <button
                        type="button"
                        className="btn-icon"
                        aria-label={`Edit ${h.symbol}`}
                        disabled={editingIndex === i}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          startEdit(i);
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className={`btn-icon ${watchlistItems.some((w) => w.module === module && w.symbol === h.symbol) ? "btn-icon-starred" : ""}`}
                        aria-label={`Add ${h.symbol} to radar`}
                        disabled={starring === h.symbol || watchlistItems.some((w) => w.module === module && w.symbol === h.symbol)}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void starHolding(h);
                        }}
                      >
                        <Star size={14} fill={watchlistItems.some((w) => w.module === module && w.symbol === h.symbol) ? "currentColor" : "none"} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-icon-danger"
                        aria-label={`Remove ${h.symbol}`}
                        disabled={removing === h.symbol}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void removeHolding(i);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  }
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
