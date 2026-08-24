"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Lock, RefreshCw, Shield, XCircle } from "lucide-react";

type SecurityPayload = {
  generatedAt: string;
  dataMode: string;
  adminEmails: { count: number; configured: boolean; note: string };
  nativeReader: {
    secretConfigured: boolean;
    tokenTtlSec: number;
    note: string;
  };
  entitlements: {
    adminGate: string;
    apiKeyGate: string;
    nativeReaderGate: string;
  };
  marketTruth: {
    goldenOk: boolean;
    demoInSignal: number;
    syntheticInSignal: number;
  };
};

function StatusDot({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
  ) : (
    <XCircle className="h-4 w-4 text-amber-400" />
  );
}

export function OpsSecurity() {
  const [data, setData] = useState<SecurityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/security", { cache: "no-store" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Request failed: ${res.status}`);
      }
      setData((await res.json()) as SecurityPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load security");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Lock className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Security</h2>
            <p>Admin roster · data mode · native reader tokens · entitlements (G3/G4)</p>
          </div>
          <button type="button" className="admin-btn" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error ? <p className="admin-error-banner">{error}</p> : null}
      {loading && !data ? <p className="text-slate-400">Loading security…</p> : null}

      {data ? (
        <>
          <div className="admin-kpi-grid ops-kpi-grid">
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Data mode</span>
              <strong className="mono text-lg">{data.dataMode}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Admin emails</span>
              <strong>{data.adminEmails.count}</strong>
            </div>
            <div className={`admin-kpi app-panel${data.nativeReader.secretConfigured ? "" : " admin-kpi-warn"}`}>
              <span className="admin-kpi-label">Native reader secret</span>
              <strong>{data.nativeReader.secretConfigured ? "Set" : "Dev fallback"}</strong>
            </div>
            <div className={`admin-kpi app-panel${data.marketTruth.goldenOk ? "" : " admin-kpi-warn"}`}>
              <span className="admin-kpi-label">G1 golden</span>
              <strong>{data.marketTruth.goldenOk ? "PASS" : "ATTENTION"}</strong>
            </div>
          </div>

          <div className="admin-grid-2">
            <section className="admin-panel app-panel">
              <h2>Admin roster</h2>
              <p className="text-sm text-slate-400">{data.adminEmails.note}</p>
              <p className="mt-2 text-xs text-slate-500">
                Gate: session email must match <code className="mono">ADMIN_EMAILS</code> env (unchanged).
              </p>
            </section>

            <section className="admin-panel app-panel">
              <h2>Native reader token</h2>
              <div className="flex items-center gap-2">
                <StatusDot ok={data.nativeReader.secretConfigured} />
                <span className="text-sm text-slate-300">
                  TTL {data.nativeReader.tokenTtlSec / 60} min ·{" "}
                  {data.nativeReader.secretConfigured
                    ? "Production secret configured"
                    : "Using dev fallback — set NATIVE_READER_TOKEN_SECRET"}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{data.nativeReader.note}</p>
            </section>
          </div>

          <section className="admin-panel app-panel">
            <h2>Entitlement boundaries</h2>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#00e676]" />
                <span>{data.entitlements.adminGate}</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#00e5ff]" />
                <span>{data.entitlements.apiKeyGate}</span>
              </li>
              <li className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>{data.entitlements.nativeReaderGate}</span>
              </li>
            </ul>
          </section>

          <section className="admin-panel app-panel">
            <h2>Market truth contamination</h2>
            <p className="text-sm text-slate-400">
              Demo in signal: <strong>{data.marketTruth.demoInSignal}</strong> · Synthetic:{" "}
              <strong>{data.marketTruth.syntheticInSignal}</strong>
            </p>
            <Link href="/admin/market-truth" className="ops-inline-link mt-2 inline-block text-sm">
              Open Market Truth console →
            </Link>
          </section>
        </>
      ) : null}
    </section>
  );
}
