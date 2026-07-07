"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Server } from "lucide-react";
import type { PlatformCard } from "@/lib/platform-monitor";

function statusColor(status: PlatformCard["status"]) {
  if (status === "healthy") return "border-emerald-500/30 bg-emerald-500/5";
  if (status === "warn") return "border-amber-500/30 bg-amber-500/5";
  if (status === "error") return "border-red-500/30 bg-red-500/5";
  return "border-[var(--border)] bg-[rgba(255,255,255,0.02)]";
}

function StatusDot({ status }: { status: PlatformCard["status"] }) {
  const color =
    status === "healthy"
      ? "bg-emerald-400"
      : status === "warn"
        ? "bg-amber-400"
        : status === "error"
          ? "bg-red-400"
          : "bg-slate-500";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function PlatformTile({ platform }: { platform: PlatformCard }) {
  return (
    <article className={`rounded-xl border p-4 ${statusColor(platform.status)}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <StatusDot status={platform.status} />
            <h3 className="font-semibold text-white">{platform.name}</h3>
          </div>
          <p className="mt-1 text-sm text-slate-400">{platform.summary}</p>
        </div>
        {platform.dashboardUrl && (
          <a
            href={platform.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn shrink-0"
            title="Open dashboard"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      {platform.metrics.length > 0 && (
        <dl className="mb-3 grid grid-cols-2 gap-2 text-xs">
          {platform.metrics.map((m) => (
            <div key={m.label} className="rounded-lg bg-[rgba(8,10,12,0.6)] px-2 py-1.5">
              <dt className="text-slate-500">{m.label}</dt>
              <dd className="font-medium text-white">{m.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <ul className="space-y-1 text-xs">
        {platform.checklist.map((item) => (
          <li key={item.label} className={item.ok ? "text-emerald-300/90" : "text-amber-300/90"}>
            {item.ok ? "✓" : "○"} {item.label}
            {item.detail ? ` — ${item.detail}` : ""}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function PlatformMonitorPanel() {
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

  return (
    <section className="admin-panel app-panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-[#00e676]" />
          <div>
            <h2>Platform monitor</h2>
            <p className="text-sm text-slate-400">Vercel · Supabase · Stripe · Resend · Terminal API</p>
          </div>
        </div>
        <button type="button" className="admin-btn" onClick={load} disabled={loading}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>
      {loading && platforms.length === 0 ? (
        <p className="text-slate-400">Loading platforms…</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {platforms.map((p) => (
            <PlatformTile key={p.id} platform={p} />
          ))}
        </div>
      )}
    </section>
  );
}
