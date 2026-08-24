"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Server } from "lucide-react";
import type { PlatformCard } from "@/lib/platform-monitor";

function statusLabel(status: PlatformCard["status"]) {
  if (status === "healthy") return "Healthy";
  if (status === "warn") return "Degraded";
  if (status === "error") return "Error";
  return "Unknown";
}

function StatusDot({ status }: { status: PlatformCard["status"] }) {
  const tone =
    status === "healthy"
      ? "healthy"
      : status === "warn"
        ? "warn"
        : status === "error"
          ? "error"
          : "unknown";
  return <span className={`ops-platform-dot ${tone}`} aria-hidden />;
}

function PlatformStripTile({ platform }: { platform: PlatformCard }) {
  return (
    <article className={`ops-platform-tile ${platform.status}`}>
      <div className="ops-platform-tile-head">
        <div>
          <div className="ops-platform-title">
            <StatusDot status={platform.status} />
            <h3>{platform.name}</h3>
          </div>
          <span className={`ops-health-badge ${platform.status}`}>{statusLabel(platform.status)}</span>
        </div>
        {platform.dashboardUrl ? (
          <a
            href={platform.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ops-platform-link"
            title="Open dashboard"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
      {platform.metrics.length > 0 ? (
        <dl className="ops-platform-metrics">
          {platform.metrics.slice(0, 3).map((m) => (
            <div key={m.label}>
              <dt>{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="ops-muted">{platform.summary}</p>
      )}
    </article>
  );
}

function PlatformGridTile({ platform }: { platform: PlatformCard }) {
  return (
    <article className={`ops-platform-tile grid ${platform.status}`}>
      <div className="ops-platform-tile-head">
        <div>
          <div className="ops-platform-title">
            <StatusDot status={platform.status} />
            <h3>{platform.name}</h3>
          </div>
          <p className="ops-muted">{platform.summary}</p>
        </div>
        {platform.dashboardUrl ? (
          <a
            href={platform.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ops-platform-link"
            title="Open dashboard"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
      {platform.metrics.length > 0 ? (
        <dl className="ops-platform-metrics grid">
          {platform.metrics.map((m) => (
            <div key={m.label}>
              <dt>{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <ul className="ops-platform-checklist">
        {platform.checklist.map((item) => (
          <li key={item.label} className={item.ok ? "ok" : "warn"}>
            {item.ok ? "✓" : "○"} {item.label}
            {item.detail ? ` — ${item.detail}` : ""}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function PlatformMonitorPanel({ variant = "grid" }: { variant?: "grid" | "strip" }) {
  const [platforms, setPlatforms] = useState<PlatformCard[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/platforms", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { platforms: PlatformCard[] };
        setPlatforms(data.platforms);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const Tile = variant === "strip" ? PlatformStripTile : PlatformGridTile;

  return (
    <section className={`ops-card ops-platform-panel ${variant}`}>
      <div className="ops-card-header spread">
        <div className="ops-card-header-title">
          <Server className="ops-card-icon green" />
          <div>
            <h3>Platform Monitor</h3>
            <p className="ops-muted">Vercel · Supabase · Stripe · Resend · Terminal API</p>
          </div>
        </div>
        <button type="button" className="ops-toolbar-btn" onClick={load} disabled={loading}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>
      {loading && platforms.length === 0 ? (
        <p className="ops-muted">Loading platforms…</p>
      ) : (
        <div className={variant === "strip" ? "ops-platform-strip" : "ops-platform-grid"}>
          {platforms.map((p) => (
            <Tile key={p.id} platform={p} />
          ))}
        </div>
      )}
    </section>
  );
}
