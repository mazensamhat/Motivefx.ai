"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";

type AuditRow = {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  capability?: string;
  risk: string;
  targetType?: string;
  targetId?: string;
  reason?: string;
  result: string;
  environment: string;
  observedAt: string;
};

export function OpsAuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ops-registry", { cache: "no-store" });
      if (res.ok) {
        const body = (await res.json()) as { audit: AuditRow[] };
        setRows(body.audit ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Audit Log</h2>
            <p>WHO · WHAT · TARGET · WHEN · WHY · RESULT for sensitive Ops actions</p>
          </div>
          <button type="button" className="ops-toolbar-btn" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </header>

      <section className="ops-card">
        {rows.length === 0 ? (
          <p className="ops-muted">
            No audit records in this process yet. Sensitive actions call{" "}
            <code className="mono">recordAudit</code>.
          </p>
        ) : (
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Risk</th>
                  <th>Target</th>
                  <th>Result</th>
                  <th>Env</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.observedAt).toLocaleString()}</td>
                    <td>{r.actorEmail}</td>
                    <td className="mono text-xs">{r.action}</td>
                    <td>
                      <span
                        className={`ops-intel-pill ${
                          r.risk === "CRITICAL" || r.risk === "HIGH" ? "critical" : "healthy"
                        }`}
                      >
                        {r.risk}
                      </span>
                    </td>
                    <td className="text-xs">
                      {[r.targetType, r.targetId].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td>{r.result}</td>
                    <td className="text-xs">{r.environment}</td>
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
