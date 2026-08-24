"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw, Rocket } from "lucide-react";

type GateStatus = "pass" | "attention" | "pending" | "external";

type GateRow = {
  id: string;
  label: string;
  status: GateStatus;
  summary: string;
  href?: string;
};

type ReleasesPayload = {
  generatedAt: string;
  gates: GateRow[];
  certificationTarget: string;
};

function GateIcon({ status }: { status: GateStatus }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "attention") return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  return <span className="h-2 w-2 rounded-full bg-slate-500" />;
}

export function OpsReleases() {
  const [data, setData] = useState<ReleasesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/releases", { cache: "no-store" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Request failed: ${res.status}`);
      }
      setData((await res.json()) as ReleasesPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load release gates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const passCount = data?.gates.filter((g) => g.status === "pass").length ?? 0;

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Rocket className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Releases</h2>
            <p>G1–G7 production hardening gate tracker</p>
          </div>
          <button type="button" className="admin-btn" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error ? <p className="admin-error-banner">{error}</p> : null}
      {loading && !data ? <p className="text-slate-400">Loading release gates…</p> : null}

      {data ? (
        <>
          <div className="admin-kpi-grid ops-kpi-grid">
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Gates passing</span>
              <strong>
                {passCount}/{data.gates.length}
              </strong>
            </div>
          </div>

          <section className="admin-panel app-panel">
            <h2>Gate tracker</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Gate</th>
                    <th>Status</th>
                    <th>Summary</th>
                    <th>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {data.gates.map((gate) => (
                    <tr key={gate.id}>
                      <td className="mono font-semibold">{gate.id}</td>
                      <td>
                        <span className="flex items-center gap-2 capitalize">
                          <GateIcon status={gate.status} />
                          {gate.status}
                        </span>
                      </td>
                      <td className="text-sm text-slate-400">{gate.summary}</td>
                      <td>
                        {gate.href ? (
                          gate.href.startsWith("http") ? (
                            <a
                              href={gate.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ops-inline-link inline-flex items-center gap-1 text-sm"
                            >
                              Open <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <Link href={gate.href} className="ops-inline-link text-sm">
                              View →
                            </Link>
                          )
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-slate-500 whitespace-pre-wrap">{data.certificationTarget}</p>
          </section>
        </>
      ) : null}
    </section>
  );
}
