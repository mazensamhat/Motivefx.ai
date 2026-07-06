import { Radar, Star, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useModules } from "../hooks/useModules";
import { useWatchlist } from "../hooks/useWatchlist";
import type { HomePersonalized } from "../types";

const MODULES = [
  { id: "trades", label: "Trades" },
  { id: "penny", label: "Pink Slips" },
  { id: "crypto", label: "Crypto" },
  { id: "betting", label: "Betting" },
  { id: "predictions", label: "Predictions" },
] as const;

interface Props {
  personalized?: HomePersonalized;
  onNavigateModule?: (tab: string) => void;
}

export function WatchlistRadar({ personalized, onNavigateModule }: Props) {
  const { isAuthenticated, openAuth } = useAuth();
  const { allowedMarkets, hasFeature } = useModules();
  const { items, addItem, removeItem } = useWatchlist();
  const [symbol, setSymbol] = useState("");
  const [module, setModule] = useState<string>(allowedMarkets[0] ?? "trades");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuth("register");
      return;
    }
    if (!symbol.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await addItem(module, symbol);
      setSymbol("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add to radar");
    } finally {
      setAdding(false);
    }
  }

  const marketOptions = allowedMarkets.length
    ? MODULES.filter((m) => allowedMarkets.includes(m.id))
    : MODULES;

  return (
    <section className="watchlist-radar glass-card">
      <div className="watchlist-radar-header">
        <h2>
          <Radar size={18} /> Your Intel Radar
        </h2>
        {personalized?.coverageLine && hasFeature("portfolio_intelligence") && (
          <span className="watchlist-coverage-badge">{personalized.coverageLine}</span>
        )}
      </div>

      {personalized?.radarHits && personalized.radarHits.length > 0 && (
        <div className="watchlist-hits">
          {personalized.radarHits.map((h) => (
            <button
              key={h.id}
              type="button"
              className="watchlist-hit-chip"
              onClick={() => onNavigateModule?.(h.module === "trades" ? "stocks" : h.module)}
            >
              <Star size={12} />
              ${h.symbol.length <= 10 ? h.symbol : h.symbol.slice(0, 10) + "…"} · {h.confidence}%
            </button>
          ))}
        </div>
      )}

      <form className="watchlist-form" onSubmit={handleAdd}>
        <select value={module} onChange={(e) => setModule(e.target.value)} aria-label="Module">
          {marketOptions.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <input
          placeholder="Symbol or matchup to track…"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
        <button type="submit" className="btn btn-sm btn-accent-terminal" disabled={adding || !symbol.trim()}>
          {adding ? "Adding…" : "Star"}
        </button>
      </form>
      {error && <p className="watchlist-error">{error}</p>}

      {items.length === 0 ? (
        <p className="watchlist-empty">
          Star symbols, matchups, or markets — Home will flag when new signals hit your radar.
        </p>
      ) : (
        <ul className="watchlist-items">
          {items.map((item) => (
            <li key={`${item.module}-${item.symbol}`}>
              <span className="watchlist-item-mod">{item.module}</span>
              <strong>${item.symbol}</strong>
              <button
                type="button"
                className="btn-icon"
                aria-label={`Remove ${item.symbol}`}
                onClick={() => removeItem(item.module, item.symbol)}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
