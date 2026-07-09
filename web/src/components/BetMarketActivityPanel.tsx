import { useCallback, useEffect, useState } from "react";
import { Filter, RefreshCw } from "lucide-react";
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

export function BetMarketActivityPanel() {
  const [sport, setSport] = useState("");
  const [matchup, setMatchup] = useState("");
  const [minBets, setMinBets] = useState("");
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [summaries, setSummaries] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [deepDiveRow, setDeepDiveRow] = useState<Record<string, unknown> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ user_id: getUserId() });
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

  return (
    <>
      <div className="card glass-card activity-panel terminal-panel">
        <div className="card-header card-header-bold">
          <div>
            <h2 className="card-title card-title-lg">Sports Bet Activity — Who&apos;s Betting on What</h2>
            <p className="activity-panel-sub">Live market flow ledger. Click any bet row for deep-dive analytics.</p>
          </div>
          <div className="activity-actions">
            <span className="activity-count">{items.length} bets · {summaries.length} games</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowFilters((s) => !s)}>
              <Filter size={14} /> Filters
            </button>
            <button className="btn btn-ghost btn-sm" onClick={fetchData} disabled={loading}>
              <RefreshCw size={14} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="activity-filters">
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
              <span>Min bets on game</span>
              <input type="number" placeholder="200" value={minBets} onChange={(e) => setMinBets(e.target.value)} />
            </label>
            <button className="btn btn-primary btn-sm" onClick={fetchData}>Apply</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSport(""); setMatchup(""); setMinBets(""); }}>Clear</button>
          </div>
        )}

        {summaries.length > 0 && (
          <div className="card-body flush">
            <div className="section-label" style={{ padding: "0.75rem 1rem 0.25rem" }}>Volume by game</div>
            <VirtualizedTable
              items={summaries}
              rowHeight={44}
              scrollThreshold={12}
              maxHeight="min(16rem, 40vh)"
              onRowClick={(row) => setDeepDiveRow({ ...row, pick: row.matchup, note: `${row.betCount} bets · ${formatUsd(row.totalStake)} total` })}
              columns={[
                {
                  key: "sport",
                  label: "Sport",
                  width: "6.5rem",
                  mobilePrimary: true,
                  render: (s) => (
                    <span className="badge badge-neutral">{String(s.sportLabel ?? s.sport)}</span>
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
                  label: "Bets entered",
                  width: "6rem",
                  className: "cell-mono",
                  mobilePrimary: true,
                  render: (s) => Number(s.betCount).toLocaleString(),
                },
                {
                  key: "totalStake",
                  label: "Total stake",
                  width: "6.5rem",
                  mobilePrimary: true,
                  render: (s) => formatUsd(s.totalStake),
                },
                { key: "lastActivity", label: "Last activity", width: "7.5rem", render: (s) => formatTime(s.lastActivity) },
              ]}
            />
          </div>
        )}

        <div className="card-body flush activity-table-wrap">
          {loading && items.length === 0 ? (
            <div className="loading">Loading bet flow…</div>
          ) : items.length === 0 ? (
            <div className="empty">No bet activity for these filters.</div>
          ) : (
            <VirtualizedTable
              items={items}
              rowHeight={44}
              maxHeight="min(28rem, 62vh)"
              onRowClick={(row) => setDeepDiveRow(row)}
              columns={[
                { key: "timestamp", label: "Time", width: "7rem", render: (r) => formatTime(r.timestamp) },
                {
                  key: "sport",
                  label: "Sport",
                  width: "5.5rem",
                  render: (r) => (
                    <span className="badge badge-neutral">{String(r.sportLabel ?? r.sport)}</span>
                  ),
                },
                {
                  key: "matchup",
                  label: "Matchup",
                  width: "1.2fr",
                  mobilePrimary: true,
                  render: (r) => <strong>{String(r.matchup)}</strong>,
                },
                {
                  key: "bettor",
                  label: "Bettor",
                  width: "6.5rem",
                  className: "cell-mono",
                  mobilePrimary: true,
                  render: (r) => String(r.bettor),
                },
                {
                  key: "pick",
                  label: "Pick",
                  width: "1fr",
                  mobilePrimary: true,
                  render: (r) => String(r.pick),
                },
                { key: "odds", label: "Odds", width: "4rem", className: "cell-mono", render: (r) => String(r.odds) },
                {
                  key: "stake",
                  label: "Stake",
                  width: "5.5rem",
                  mobilePrimary: true,
                  render: (r) => formatUsd(r.stake),
                },
                {
                  key: "gameBetCount",
                  label: "Game bets",
                  width: "5.5rem",
                  className: "cell-mono",
                  render: (r) => Number(r.gameBetCount).toLocaleString(),
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
