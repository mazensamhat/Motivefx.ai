"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";

type TelemetryRow = {
  eventId: string;
  eventName: string;
  observedAt: string;
  status?: string;
  provider?: string;
  symbol?: string;
  product?: string;
  desk?: string;
  instrumentationErrors: string[];
  metadata: Record<string, unknown>;
};

type LivePayload = {
  generatedAt: string;
  telemetry: {
    buffered: number;
    withErrors: number;
    recent: TelemetryRow[];
  };
  audit: {
    id: string;
    action: string;
    actorEmail: string;
    risk: string;
    result: string;
    observedAt: string;
  }[];
};

export function OpsLiveOperations() {
  const [data, setData] = useState<LivePayload | null>(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ops-registry", { cache: "no-store" });
      if (res.ok) setData((await res.json()) as LivePayload);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, [load]);

  const events = (data?.telemetry.recent ?? []).filter((e) => {
    if (filter === "all") return true;
    if (filter === "errors") return (e.instrumentationErrors?.length ?? 0) > 0 || e.status === "error";
    return e.eventName.startsWith(filter);
  });

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Activity className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Live Operations</h2>
            <p>
              In-process event stream · {data?.telemetry.buffered ?? 0} buffered ·{" "}
              {data?.telemetry.withErrors ?? 0} with registry errors
            </p>
          </div>
          <button type="button" className="ops-toolbar-btn" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </header>

      <div className="ops-filter-row">
        {["all", "signal", "provider", "ai", "ops", "errors"].map((f) => (
          <button
            key={f}
            type="button"
            className={`ops-toolbar-btn${filter === f ? " active-filter" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <section className="ops-card">
        {events.length === 0 ? (
          <p className="ops-muted">
            No telemetry yet. Events appear as Ops surfaces and pipelines emit via{" "}
            <code className="mono">recordTelemetry</code>.
          </p>
        ) : (
          <ul className="ops-live-feed">
            {events.map((e) => (
              <li key={e.eventId}>
                <time>{new Date(e.observedAt).toLocaleTimeString()}</time>
                <span className="ops-live-name">{e.eventName}</span>
                <span className="ops-muted">
                  {[e.symbol, e.provider, e.product, e.desk].filter(Boolean).join(" · ") || "—"}
                </span>
                {e.instrumentationErrors?.length ? (
                  <span className="ops-truth-badge critical">UNKNOWN</span>
                ) : (
                  <span className="ops-truth-badge live">{e.status ?? "ok"}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {data?.audit?.length ? (
        <section className="ops-card">
          <header className="ops-card-header">
            <h3>Recent operator actions</h3>
          </header>
          <ul className="ops-live-feed">
            {data.audit.slice(0, 12).map((a) => (
              <li key={a.id}>
                <time>{new Date(a.observedAt).toLocaleTimeString()}</time>
                <span className="ops-live-name">{a.action}</span>
                <span className="ops-muted">
                  {a.actorEmail} · {a.risk}
                </span>
                <span className={`ops-intel-pill ${a.result === "success" ? "healthy" : "critical"}`}>
                  {a.result}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
