"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

type CapRow = { id: string; risk: string; granted: boolean };

type RolesPayload = {
  actor: { email: string; role: string; note: string };
  capabilities: CapRow[];
  grantedCount: number;
  totalCount: number;
};

export function OpsRolesAccess() {
  const [data, setData] = useState<RolesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/roles", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        setData((await res.json()) as RolesPayload);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load roles");
      }
    })();
  }, []);

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2>Roles &amp; Access</h2>
          <p>Capability model for MotiveFX Ops. Sensitive routes check capabilities server-side.</p>
        </div>
      </header>

      {error ? <p className="admin-error-banner">{error}</p> : null}

      {data ? (
        <>
          <section className="ops-card">
            <header className="ops-card-header">
              <h3>Current actor</h3>
            </header>
            <p>
              <strong>{data.actor.email}</strong> · role <code>{data.actor.role}</code>
            </p>
            <p className="ops-muted" style={{ marginTop: 8 }}>
              {data.actor.note}
            </p>
            <p className="ops-muted" style={{ marginTop: 8 }}>
              {data.grantedCount} / {data.totalCount} capabilities granted
            </p>
          </section>

          <section className="ops-card">
            <header className="ops-card-header">
              <h3>Capabilities</h3>
            </header>
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Capability</th>
                    <th>Risk</th>
                    <th>Granted</th>
                  </tr>
                </thead>
                <tbody>
                  {data.capabilities.map((c) => (
                    <tr key={c.id}>
                      <td className="mono">{c.id}</td>
                      <td>{c.risk}</td>
                      <td>{c.granted ? "yes" : "no"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : !error ? (
        <p className="ops-muted">Loading roles…</p>
      ) : null}
    </section>
  );
}
