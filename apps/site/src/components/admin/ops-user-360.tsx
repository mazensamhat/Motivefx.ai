"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Eye, RefreshCw, UserRound } from "lucide-react";

type User360 = {
  user: {
    id: string;
    email: string;
    tier: string;
    markets: string | null;
    subscriptionStatus: string;
    statusLabel: string;
    accessLabel: string;
    disabled: boolean;
    hasSubscription: boolean;
    hasStripe: boolean;
    createdAt: string;
    lastSeenAt: string | null;
    country: string | null;
    acquisition: string | null;
  };
  health: {
    score: string;
    usageEvents30d: number;
    daysSinceActive: number | null;
    portfolios: number;
    trend: string;
  };
  alerts: { id: string; title: string; symbol: string | null; seen: boolean; createdAt: string }[];
  feedback: { id: string; message: string; kind: string; createdAt: string }[];
};

export function OpsUser360({ userId }: { userId: string }) {
  const [data, setData] = useState<User360 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [impersonating, setImpersonating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("User not found");
      setData((await res.json()) as User360);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function startImpersonation() {
    if (!reason.trim()) {
      setError("Impersonation reason is required");
      return;
    }
    setImpersonating(true);
    try {
      const res = await fetch("/api/admin/impersonation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, reason, mode: "VIEW_AS_USER" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to start impersonation");
      }
      window.dispatchEvent(new Event("ops:impersonation-changed"));
      window.location.href = "/app";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impersonation failed");
    } finally {
      setImpersonating(false);
    }
  }

  if (loading && !data) return <p className="ops-muted">Loading User 360…</p>;
  if (error && !data) return <p className="ops-error-banner">{error}</p>;
  if (!data) return null;

  const { user, health } = data;

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <UserRound className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <Link href="/admin/users" className="ops-muted" style={{ display: "inline-flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
              <ArrowLeft className="h-3.5 w-3.5" /> Users
            </Link>
            <h2>{user.email}</h2>
            <p>
              User 360 · {user.tier} · {user.statusLabel} · health {health.score}
            </p>
          </div>
          <button type="button" className="ops-toolbar-btn" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </header>

      {error ? <p className="ops-error-banner">{error}</p> : null}

      <div className="ops-kpi-row" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <article className="ops-kpi-card">
          <span className="ops-kpi-label">Customer health</span>
          <strong className="ops-kpi-value" style={{ fontSize: "1.1rem" }}>
            {health.score}
          </strong>
        </article>
        <article className="ops-kpi-card">
          <span className="ops-kpi-label">Usage 30d</span>
          <strong className="ops-kpi-value">{health.usageEvents30d}</strong>
        </article>
        <article className="ops-kpi-card">
          <span className="ops-kpi-label">Days since active</span>
          <strong className="ops-kpi-value">{health.daysSinceActive ?? "—"}</strong>
        </article>
        <article className="ops-kpi-card">
          <span className="ops-kpi-label">Portfolios</span>
          <strong className="ops-kpi-value">{health.portfolios}</strong>
        </article>
      </div>

      <div className="ops-attention-grid">
        <section className="ops-card">
          <header className="ops-card-header">
            <h3>Overview</h3>
          </header>
          <dl className="ops-platform-metrics grid">
            <div>
              <dt>Plan</dt>
              <dd>{user.tier}</dd>
            </div>
            <div>
              <dt>Subscription</dt>
              <dd>{user.subscriptionStatus}</dd>
            </div>
            <div>
              <dt>Access</dt>
              <dd>{user.accessLabel}</dd>
            </div>
            <div>
              <dt>Stripe</dt>
              <dd>{user.hasStripe ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Country</dt>
              <dd>{user.country ?? "—"}</dd>
            </div>
            <div>
              <dt>Acquisition</dt>
              <dd>{user.acquisition ?? "—"}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt>Last active</dt>
              <dd>{user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : "—"}</dd>
            </div>
          </dl>
          {user.disabled ? <p className="ops-truth-badge critical">DISABLED</p> : null}
        </section>

        <section className="ops-card">
          <header className="ops-card-header">
            <h3>Support · Enter as user</h3>
          </header>
          <p className="ops-muted" style={{ marginBottom: "0.75rem" }}>
            Creates a dedicated impersonation session. Never uses the customer password. Default mode:
            VIEW AS USER.
          </p>
          <textarea
            className="ops-truth-input"
            style={{ width: "100%", minHeight: 72, marginBottom: 8 }}
            placeholder="Reason * (required for audit)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            type="button"
            className="ops-toolbar-btn"
            onClick={() => void startImpersonation()}
            disabled={impersonating}
          >
            <Eye className="h-4 w-4" /> {impersonating ? "Starting…" : "Enter as user"}
          </button>
        </section>
      </div>

      <div className="ops-attention-grid">
        <section className="ops-card">
          <header className="ops-card-header">
            <h3>Alerts</h3>
          </header>
          {data.alerts.length === 0 ? (
            <p className="ops-muted">No recent alerts</p>
          ) : (
            <ul className="ops-live-feed">
              {data.alerts.map((a) => (
                <li key={a.id}>
                  <time>{new Date(a.createdAt).toLocaleString()}</time>
                  <span className="ops-live-name">{a.title}</span>
                  <span className="ops-muted">{a.symbol ?? "—"}</span>
                  <span className={`ops-intel-pill ${a.seen ? "healthy" : "degraded"}`}>
                    {a.seen ? "seen" : "unread"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="ops-card">
          <header className="ops-card-header">
            <h3>Feedback</h3>
          </header>
          {data.feedback.length === 0 ? (
            <p className="ops-muted">No feedback</p>
          ) : (
            <ul className="ops-live-feed">
              {data.feedback.map((f) => (
                <li key={f.id}>
                  <time>{new Date(f.createdAt).toLocaleString()}</time>
                  <span className="ops-live-name">{f.kind}</span>
                  <span className="ops-muted">{f.message.slice(0, 80)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
