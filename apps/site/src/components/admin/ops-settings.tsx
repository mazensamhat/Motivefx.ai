"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Settings } from "lucide-react";
import {
  MOTIVE_CORP_URL,
  MOTIVEIQ_OPS_URL,
  MOTIVELIFE_OPS_URL,
  MOTIVEPULSE_OPS_URL,
} from "@/lib/ops-links";

type SettingsPayload = {
  generatedAt: string;
  dataMode: string;
  adminEmails: { count: number; configured: boolean; note: string };
  opsLinks: { label: string; href: string; external: boolean }[];
};

export function OpsSettings() {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Request failed: ${res.status}`);
      }
      setData((await res.json()) as SettingsPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
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
          <Settings className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Settings</h2>
            <p>Ops links · data mode · admin configuration notes</p>
          </div>
          <button type="button" className="admin-btn" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error ? <p className="admin-error-banner">{error}</p> : null}
      {loading && !data ? <p className="text-slate-400">Loading settings…</p> : null}

      {data ? (
        <>
          <div className="admin-kpi-grid ops-kpi-grid">
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">MOTIVEFX_DATA_MODE</span>
              <strong className="mono text-lg">{data.dataMode}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Admin emails</span>
              <strong>{data.adminEmails.count}</strong>
            </div>
          </div>

          <section className="admin-panel app-panel">
            <h2>Admin access</h2>
            <p className="text-sm text-slate-400">{data.adminEmails.note}</p>
            <p className="mt-2 text-xs text-slate-500">
              Configure via <code className="mono">ADMIN_EMAILS</code> env on Vercel. Auth model
              unchanged — session email must match.
            </p>
          </section>

          <section className="admin-panel app-panel">
            <h2>Cross-product ops links</h2>
            <ul className="space-y-2">
              {data.opsLinks.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ops-inline-link inline-flex items-center gap-1 text-sm"
                    >
                      {link.label} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <Link href={link.href} className="ops-inline-link text-sm">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-panel app-panel">
            <h2>Documentation</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/admin/legacy" className="ops-inline-link">
                  Classic scroll dashboard
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/mazensamhat/Motivefx.ai/blob/main/docs/MOTIVEFX_OPS_MASTER_PLAN.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ops-inline-link inline-flex items-center gap-1"
                >
                  MotiveFX Ops master plan <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/mazensamhat/Motivefx.ai/blob/main/docs/PRODUCTION_HARDENING_MASTER_PLAN.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ops-inline-link inline-flex items-center gap-1"
                >
                  Production hardening (G1–G7) <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </section>
        </>
      ) : null}
    </section>
  );
}

// Static fallbacks for SSR-safe link labels (also returned by API)
export const OPS_LINK_DEFAULTS = [
  { label: "Motive Life Marketing Studio", href: MOTIVELIFE_OPS_URL, external: true },
  { label: "MotivePulse Ops", href: MOTIVEPULSE_OPS_URL, external: true },
  { label: "Motive IQ Console", href: MOTIVEIQ_OPS_URL, external: true },
  { label: "Motive Corp", href: MOTIVE_CORP_URL, external: true },
];
