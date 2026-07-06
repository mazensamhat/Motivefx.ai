import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Link2,
  RefreshCw,
  AlertCircle,
  Plug,
} from "lucide-react";
import {
  adminGet,
  adminPost,
  type AdminDashboard,
  type SocialIntegration,
  type SocialIntegrationsResponse,
} from "../lib/adminApi";
import { shortLinkForChannel } from "../lib/acquisition";

const PLATFORM_HINTS: Record<string, string> = {
  instagram: "Meta Graph API — IG Business ID + long-lived Page access token",
  facebook: "Meta Graph API — Facebook Page ID + access token",
  tiktok: "TikTok Open API — access token + open_id",
  youtube: "YouTube Data API v3 — API key + channel ID",
  x: "X API v2 — Bearer token + user ID",
  website: "Internal analytics — tracks visits via /go/web short links",
};

interface Props {
  channelStats?: AdminDashboard["channelPerformance"];
}

export function SocialIntegrationsPanel({ channelStats }: Props) {
  const [integrations, setIntegrations] = useState<SocialIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ accountId: "", accessToken: "" });
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGet<SocialIntegrationsResponse>("/social/integrations");
      setIntegrations(res.integrations);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function syncAll() {
    setSyncing(true);
    try {
      const res = await adminPost<SocialIntegrationsResponse & { results: unknown[] }>("/social/sync");
      setIntegrations(res.integrations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function syncOne(channelId: string) {
    setSyncing(true);
    try {
      const res = await adminPost<SocialIntegrationsResponse>(`/social/sync/${channelId}`);
      setIntegrations(res.integrations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function saveCredentials(channelId: string) {
    try {
      const res = await adminPost<SocialIntegrationsResponse>("/social/credentials", {
        channel_id: channelId,
        account_id: form.accountId || null,
        access_token: form.accessToken || null,
      });
      setIntegrations(res.integrations);
      setEditing(null);
      setForm({ accountId: "", accessToken: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  function trackedLink(channelId: string) {
    return shortLinkForChannel(channelId);
  }

  function copyLink(channelId: string) {
    navigator.clipboard.writeText(trackedLink(channelId)).then(() => {
      setCopied(channelId);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function statsFor(id: string) {
    return channelStats?.channels.find((c) => c.id === id);
  }

  if (loading && integrations.length === 0) {
    return <section className="admin-panel glass-panel"><p>Loading social integrations…</p></section>;
  }

  return (
    <section className="admin-panel glass-panel social-integrations-panel">
      <div className="social-int-header">
        <div className="social-int-title-row">
          <Plug size={20} className="social-int-icon" />
          <div>
            <h2>Social API Integrations</h2>
            <p className="social-int-sub">
              Connect Instagram, TikTok, Facebook, YouTube, and X to pull live metrics and tie them to subscription traffic.
            </p>
          </div>
        </div>
        <button type="button" className="btn admin-btn" onClick={syncAll} disabled={syncing}>
          <RefreshCw size={14} /> {syncing ? "Syncing…" : "Sync all channels"}
        </button>
      </div>

      {error && <p className="admin-error-banner">{error}</p>}

      <div className="social-int-grid">
        {integrations.map((int) => {
          const stats = statsFor(int.id);
          const m = int.latestMetrics;
          const statusOk = int.connectionStatus === "connected";
          return (
            <div key={int.id} className={`social-int-card ${statusOk ? "connected" : ""}`}>
              <div className="social-int-card-head">
                <strong>{int.platform}</strong>
                <span className={`social-status social-status-${int.connectionStatus}`}>
                  {statusOk ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {int.connectionStatus}
                </span>
              </div>
              <p className="social-int-handle">{int.handle}</p>
              <p className="social-int-hint">{PLATFORM_HINTS[int.id]}</p>

              <div className="social-int-metrics">
                <div><span>Followers</span><strong>{m?.followers?.toLocaleString() ?? "—"}</strong></div>
                <div><span>Impressions</span><strong>{m?.impressions?.toLocaleString() ?? "—"}</strong></div>
                <div><span>Visits (30d)</span><strong>{stats?.visits ?? 0}</strong></div>
                <div><span>Signups</span><strong>{stats?.signups ?? 0}</strong></div>
                <div><span>Payments</span><strong>{stats?.payments ?? 0}</strong></div>
                <div><span>Revenue</span><strong>${(stats?.revenueUsd ?? 0).toLocaleString()}</strong></div>
              </div>

              {(stats?.visits ?? 0) > 0 && (
                <p className="social-int-funnel">
                  Funnel: {stats!.visits} visits → {stats!.signups} signups → {stats!.payments} payments
                  ({stats!.visitToSignupRate ?? 0}% visit→signup)
                </p>
              )}

              <div className="social-int-actions">
                <button type="button" className="btn admin-btn" onClick={() => copyLink(int.id)}>
                  <Link2 size={12} /> {copied === int.id ? "Copied!" : "Copy short link"}
                </button>
                {int.url && (
                  <a href={int.url} target="_blank" rel="noreferrer" className="btn admin-btn">
                    <ExternalLink size={12} /> Profile
                  </a>
                )}
                <button type="button" className="btn admin-btn" onClick={() => syncOne(int.id)} disabled={syncing}>
                  Sync
                </button>
                <button
                  type="button"
                  className="btn admin-btn"
                  onClick={() => {
                    setEditing(editing === int.id ? null : int.id);
                    setForm({ accountId: int.accountId ?? "", accessToken: "" });
                  }}
                >
                  {int.configured ? "Update API" : "Connect API"}
                </button>
              </div>

              {int.syncError && <p className="social-int-error">{int.syncError}</p>}
              {int.lastSyncAt && (
                <p className="social-int-sync-time">Last sync: {new Date(int.lastSyncAt).toLocaleString()}</p>
              )}

              {editing === int.id && int.id !== "website" && (
                <div className="social-int-form">
                  <label>
                    Account / Channel ID
                    <input
                      value={form.accountId}
                      onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                      placeholder="e.g. 17841400000000000"
                    />
                  </label>
                  <label>
                    Access token / API key
                    <input
                      type="password"
                      value={form.accessToken}
                      onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
                      placeholder="Paste token (stored in local DB)"
                    />
                  </label>
                  <button type="button" className="btn btn-annual-cta" onClick={() => saveCredentials(int.id)}>
                    Save credentials
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
