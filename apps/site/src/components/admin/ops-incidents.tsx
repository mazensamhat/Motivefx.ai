"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Incident = {
  id: string;
  severity: string;
  domain: string;
  title: string;
  description: string;
  status: string;
  href?: string;
  runbook?: string;
  lastSeen: string;
};

export function OpsIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState({ open: 0, critical: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/incidents", { cache: "no-store" });
      if (res.ok) {
        const body = (await res.json()) as {
          incidents: Incident[];
          open: number;
          critical: number;
        };
        setIncidents(body.incidents);
        setStats({ open: body.open, critical: body.critical });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function ack(id: string, status: "acknowledged" | "investigating" | "resolved") {
    await fetch("/api/admin/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incidentId: id, status }),
    });
    await load();
  }

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Alerts &amp; Incidents</h2>
            <p>
              {stats.open} open · {stats.critical} critical · sourced from Command attention
            </p>
          </div>
          <button type="button" className="ops-toolbar-btn" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </header>

      <section className="ops-card">
        {incidents.length === 0 ? (
          <p className="ops-muted">No active incidents. All systems clear.</p>
        ) : (
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Title</th>
                  <th>Domain</th>
                  <th>Status</th>
                  <th>Runbook</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <span
                        className={`ops-intel-pill ${
                          i.severity === "CRITICAL" || i.severity === "HIGH"
                            ? "critical"
                            : "degraded"
                        }`}
                      >
                        {i.severity}
                      </span>
                    </td>
                    <td>
                      {i.href ? <Link href={i.href}>{i.title}</Link> : i.title}
                      {i.description ? (
                        <div className="ops-muted" style={{ fontSize: "0.75rem" }}>
                          {i.description}
                        </div>
                      ) : null}
                    </td>
                    <td>{i.domain}</td>
                    <td>{i.status}</td>
                    <td className="text-xs">{i.runbook ?? "—"}</td>
                    <td>
                      <div className="ops-filter-row">
                        <button
                          type="button"
                          className="ops-toolbar-btn"
                          onClick={() => void ack(i.id, "acknowledged")}
                        >
                          Ack
                        </button>
                        <button
                          type="button"
                          className="ops-toolbar-btn"
                          onClick={() => void ack(i.id, "resolved")}
                        >
                          Resolve
                        </button>
                      </div>
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
