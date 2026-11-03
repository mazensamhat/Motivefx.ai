"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, TrendingUp } from "lucide-react";

type Channel = {
  id: string;
  platform: string;
  handle: string | null;
  url: string | null;
  active: boolean;
  connectionStatus: string;
  lastSyncAt: string | null;
  syncError: string | null;
  latest: {
    snapshotDate: string;
    followers: number | null;
    impressions: number | null;
    profileViews: number | null;
    linkClicks: number | null;
    engagementRate: number | null;
    postsCount: number | null;
    syncedAt: string;
  } | null;
};

export function OpsSocialPerformance() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [creativeEvents, setCreativeEvents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/social-performance", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const body = (await res.json()) as {
        channels: Channel[];
        creativePerformanceEvents: number;
      };
      setChannels(body.channels ?? []);
      setCreativeEvents(body.creativePerformanceEvents ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load social performance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function sync() {
    setSyncing(true); setSyncMessage(null);
    try {
      const res = await fetch("/api/admin/social-performance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync_providers" }) });
      if (!res.ok) throw new Error(`Could not sync channels (${res.status})`);
      const result = await res.json() as { synced: number; results: Array<{ status: string }> };
      const disconnected = result.results.filter(row => row.status === "disconnected").length;
      const failed = result.results.filter(row => row.status === "failed").length;
      setSyncMessage(`Synced ${result.synced} channel(s).${disconnected ? ` ${disconnected} need a company-account connection.` : ""}${failed ? ` ${failed} could not refresh; see the channel details.` : ""}`);
      await load();
    } catch (error) { setSyncMessage(error instanceof Error ? error.message : "Could not sync channels"); }
    finally { setSyncing(false); }
  }

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Social Performance</h2>
            <p>
              Observed company-account metrics · {creativeEvents} creative performance events
            </p>
          </div>
          <button type="button" className="ops-toolbar-btn" onClick={() => void sync()} disabled={loading || syncing}>
            {syncing ? "Syncing…" : "Sync channels"}
          </button>
          <button type="button" className="ops-toolbar-btn" onClick={load} disabled={loading || syncing}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </header>

      {error ? <p className="admin-error-banner">{error}</p> : null}
      {syncMessage ? <p role="status">{syncMessage}</p> : null}

      <section className="ops-card">
        <header className="ops-card-header">
          <h3>Connected channels</h3>
        </header>
        {channels.length === 0 ? (
          <p className="ops-muted">
            Connect the company accounts to collect their observed social metrics.
          </p>
        ) : (
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Connection</th>
                  <th>Latest snapshot</th>
                  <th>Followers</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>Engagement</th>
                  <th>Sync</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((channel) => (
                  <tr key={channel.id}>
                    <td>
                      <strong>{channel.platform}</strong>
                      <div className="ops-muted" style={{ fontSize: "0.75rem" }}>{channel.handle ?? channel.id}</div>
                    </td>
                    <td>{channel.connectionStatus}</td>
                    <td>{channel.latest?.snapshotDate ?? "—"}</td>
                    <td>{channel.latest?.followers?.toLocaleString() ?? "—"}</td>
                    <td>{channel.latest?.impressions?.toLocaleString() ?? "—"}</td>
                    <td>{channel.latest?.linkClicks?.toLocaleString() ?? "—"}</td>
                    <td>{channel.latest?.engagementRate != null ? `${channel.latest.engagementRate.toFixed(2)}%` : "—"}</td>
                    <td>
                      {channel.latest?.syncedAt
                        ? new Date(channel.latest.syncedAt).toLocaleString()
                        : channel.lastSyncAt
                          ? new Date(channel.lastSyncAt).toLocaleString()
                          : "Never"}
                      {channel.syncError ? (
                        <div className="ops-muted" style={{ fontSize: "0.75rem" }}>{channel.syncError}</div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
