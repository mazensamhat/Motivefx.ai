import { useCallback, useEffect, useState } from "react";
import { Filter, RefreshCw, X } from "lucide-react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { apiGet, getUserId } from "../lib/api";
import { buildAssetDeepDive } from "../utils/assetDeepDive";
import { AssetDeepDiveModal } from "./AssetDeepDiveModal";
import { formatTime, formatUsd } from "./ActivityPanel";
import { VirtualizedTable } from "./VirtualizedTable";

const SPORT_OPTIONS = [
  { value: "football", label: "Football (NFL)" },
  { value: "basketball", label: "Basketball (NBA)" },
  { value: "baseball", label: "Baseball (MLB)" },
  { value: "hockey", label: "Hockey (NHL)" },
  { value: "soccer", label: "Soccer" },
  { value: "mma", label: "MMA / UFC" },
  { value: "tennis", label: "Tennis" },
];

function ActivitySkeleton() {
  return (
    <div className="activity-skeleton" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="activity-skeleton-card">
          <div className="activity-skeleton-line activity-skeleton-line-lg" />
          <div className="activity-skeleton-row">
            <div className="activity-skeleton-pill" />
            <div className="activity-skeleton-line" />
            <div className="activity-skeleton-line activity-skeleton-line-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

function displayOdds(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

function displayStake(v: unknown): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return formatUsd(n);
}

function displayCount(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString();
}

export function BetMarketActivityPanel() {
  const isMobile = useMediaQuery("(max-width: 900px)");
  const [sport, setSport] = useState("");
  const [matchup, setMatchup] = useState("");
  const [minBets, setMinBets] = useState("");
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [summaries, setSummaries] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [deepDiveRow, setDeepDiveRow] = useState<Record<string, unknown> | null>(null);

  const activeFilterCount = [sport, matchup.trim(), minBets].filter(Boolean).length;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ user_id: getUserId(), limit: "40" });
      if (sport) params.set("sport", sport);
      if (matchup.trim()) params.set("matchup", matchup.trim());
      if (minBets) params.set("min_bets", minBets);
      const data = await apiGet<{
        items: Record<string, unknown>[];
        summaries: Record<string, unknown>[];
      }>(`/betting/market-activity?${params.toString()}`);
      setItems(data.items ?? []);
      setSummaries(data.summaries ?? []);
    } catch {
      setItems([]);
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  }, [sport, matchup, minBets]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function clearFilters() {
    setSport("");
    setMatchup("");
    setMinBets("");
  }

  function applyFilters() {
    void fetchData();
    if (isMobile) setShowFilters(false);
  }

  const filterFields = (
    <>
      <label className="filter-field">
        <span>Sport</span>
        <select value={sport} onChange={(e) => setSport(e.target.value)}>
          <option value="">All sports</option>
          {SPORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        <span>Game / matchup</span>
        <input placeholder="Chiefs, Lakers…" value={matchup} onChange={(e) => setMatchup(e.target.value)} />
      </label>
      <label className="filter-field">
        <span>Min quotes on game</span>
        <input type="number" placeholder="1" value={minBets} onChange={(e) => setMinBets(e.target.value)} />
      </label>
    </>
  );

  return (
    <>
      <div className={`card glass-card activity-panel terminal-panel ${isMobile ? "activity-panel-mobile" : ""}`}>
        <div className="card-header card-header-bold">
          <div>
            <h2 className="card-title card-title-lg">Sports Bet Activity</h2>
            <p className="activity-panel-sub">
              {isMobile
                ? "Live sportsbook quotes from the line board."
                : "Live sportsbook quotes (SharpAPI / Odds API). Click a row for deep-dive context."}
            </p>
          </div>
          <div className="activity-actions">
            <span className="activity-count">
              {loading && items.length === 0
                ? "Loading…"
                : isMobile
                  ? items.length === 0
                    ? "No quotes yet"
                    : `${items.length} quotes`
                  : `${items.length} quotes · ${summaries.length} games`}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowFilters((s) => !s)}
              aria-expanded={showFilters}
            >
              <Filter size={14} />
              Filters
              {activeFilterCount > 0 ? (
                <span className="activity-filter-badge">{activeFilterCount}</span>
              ) : null}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={fetchData} disabled={loading}>
              <RefreshCw size={14} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>

        {showFilters && !isMobile && (
          <div className="activity-filters">
            {filterFields}
            <button type="button" className="btn btn-primary btn-sm" onClick={applyFilters}>Apply</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>
          </div>
        )}

        {showFilters && isMobile && (
          <div className="activity-filter-sheet-overlay" onClick={() => setShowFilters(false)} role="presentation">
            <div
              className="activity-filter-sheet"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal
              aria-label="Activity filters"
            >
              <div className="activity-filter-sheet-head">
                <h3>Filters</h3>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowFilters(false)} aria-label="Close filters">
                  <X size={16} />
                </button>
              </div>
              <div className="activity-filters activity-filters-sheet">{filterFields}</div>
              <div className="activity-filter-sheet-actions">
                <button type="button" className="btn btn-ghost" onClick={clearFilters}>Clear</button>
                <button type="button" className="btn btn-primary" onClick={applyFilters}>Show results</button>
              </div>
            </div>
          </div>
        )}

        {summaries.length > 0 && !isMobile && (
          <div className="card-body flush">
            <div className="section-label" style={{ padding: "0.75rem 1rem 0.25rem" }}>Volume by game</div>
            <VirtualizedTable
              items={summaries}
              rowHeight={44}
              scrollThreshold={12}
              maxHeight="min(16rem, 40vh)"
              sortable
              onRowClick={(row) =>
                setDeepDiveRow({
                  ...row,
                  pick: row.matchup,
                  note: `${displayCount(row.betCount)} quotes${row.sharpSide ? ` · lean ${row.sharpSide}` : ""}`,
                })
              }
              columns={[
                {
                  key: "sport",
                  label: "Sport",
                  width: "5.5rem",
                  mobilePrimary: true,
                  render: (s) => (
                    <span className="badge badge-neutral badge-sport">{String(s.sportLabel ?? s.sport)}</span>
                  ),
                },
                {
                  key: "matchup",
                  label: "Matchup",
                  width: "1.4fr",
                  mobilePrimary: true,
                  render: (s) => <strong>{String(s.matchup)}</strong>,
                },
                {
                  key: "betCount",
                  label: "Quotes",
                  width: "5.5rem",
                  className: "cell-mono",
                  mobilePrimary: true,
                  render: (s) => displayCount(s.betCount),
                },
                {
                  key: "totalStake",
                  label: "Stake",
                  width: "5.5rem",
                  mobilePrimary: true,
                  render: (s) => displayStake(s.totalStake),
                },
                { key: "lastActivity", label: "Last activity", width: "7.5rem", render: (s) => formatTime(s.lastActivity) },
              ]}
            />
          </div>
        )}

        <div className="card-body flush activity-table-wrap">
          {loading && items.length === 0 ? (
            <ActivitySkeleton />
          ) : items.length === 0 ? (
            <div className="activity-empty">
              <strong>No quotes yet</strong>
              <p>No line-board quotes for these filters. Try clearing filters or check SharpAPI / Odds keys.</p>
              {activeFilterCount > 0 ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : (
            <VirtualizedTable
              items={items}
              rowHeight={44}
              maxHeight="min(28rem, 62vh)"
              sortable
              onRowClick={(row) => setDeepDiveRow(row)}
              columns={[
                { key: "timestamp", label: "Time", width: "7rem", render: (r) => formatTime(r.timestamp) },
                {
                  key: "bettor",
                  label: "Who",
                  width: "6.5rem",
                  mobilePrimary: true,
                  mobilePriority: 0,
                  render: (r) => String(r.bettor ?? "—"),
                },
                {
                  key: "pick",
                  label: "Pick",
                  width: "1fr",
                  mobilePrimary: true,
                  mobilePriority: 1,
                  render: (r) => String(r.pick ?? "—"),
                },
                {
                  key: "stake",
                  label: "Stake",
                  width: "5rem",
                  mobilePrimary: true,
                  mobilePriority: 2,
                  render: (r) => displayStake(r.stake),
                },
                {
                  key: "matchup",
                  label: "Matchup",
                  width: "1.2fr",
                  mobilePrimary: true,
                  mobilePriority: 3,
                  render: (r) => <strong>{String(r.matchup)}</strong>,
                },
                {
                  key: "sport",
                  label: "Sport",
                  width: "5rem",
                  render: (r) => (
                    <span className="badge badge-neutral badge-sport">{String(r.sportLabel ?? r.sport ?? "—")}</span>
                  ),
                },
                {
                  key: "odds",
                  label: "Odds",
                  width: "4.5rem",
                  className: "cell-mono",
                  render: (r) => displayOdds(r.odds),
                },
                {
                  key: "gameBetCount",
                  label: "Sides",
                  width: "4.5rem",
                  className: "cell-mono",
                  render: (r) => displayCount(r.gameBetCount),
                },
              ]}
            />
          )}
        </div>
      </div>

      <AssetDeepDiveModal
        payload={deepDiveRow ? buildAssetDeepDive(deepDiveRow, "betting") : null}
        module="betting"
        onClose={() => setDeepDiveRow(null)}
      />
    </>
  );
}
