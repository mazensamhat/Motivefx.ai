import { useEffect, useRef, useState } from "react";
import { Briefcase, Star, Trash2, Wand2 } from "lucide-react";
import { apiGet, apiPost, getUserId } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import type { BrandModuleId } from "../brand/moduleBrand";
import type { AdvisorResult } from "../types";
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
  const [symbol, setSymbol] = useState("");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [deepDive, setDeepDive] = useState<AssetDeepDivePayload | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [starring, setStarring] = useState<string | null>(null);
  const { items: watchlistItems, addItem: addToWatchlist } = useWatchlist();
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

  async function addHolding() {
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
      await persistHoldings([...holdings, h], holdings);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save holding");
      return;
    }

    setSymbol("");
    setQty("");
    setCost("");
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
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not remove holding");
    } finally {
      setRemoving(null);
    }
  }

  function openHoldingDetail(h: Holding) {
    setSelectedSymbol(h.symbol);
    setDeepDive(
      buildAssetDeepDive(
        {
          symbol: h.symbol,
          shares: h.shares,
          amount: h.amount,
          price: h.avg_cost,
          side: "buy",
          timestamp: new Date().toISOString(),
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
            + Add holding
          </button>
        </div>

        {formError && <div className="portfolio-form-error">{formError}</div>}

        <div className="card-body flush terminal-feed">
          {holdings.length === 0 ? (
            <div className="empty">Type a symbol and shares, then add to your live ledger.</div>
          ) : (
            <>
              <p className="ledger-hint">Tap a holding for details · use trash to remove</p>
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
