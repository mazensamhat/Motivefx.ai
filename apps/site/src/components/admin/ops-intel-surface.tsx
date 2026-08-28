"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { RefreshCw } from "lucide-react";

export function OpsIntelSurface({
  title,
  description,
  icon: Icon,
  surface,
  render,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  surface: string;
  render: (data: Record<string, unknown>) => ReactNode;
}) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/intelligence?surface=${surface}`, { cache: "no-store" });
      if (res.ok) setData((await res.json()) as Record<string, unknown>);
    } finally {
      setLoading(false);
    }
  }, [surface]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" className="ops-toolbar-btn" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </header>
      {loading && !data ? <p className="ops-muted">Loading…</p> : null}
      {data ? render(data) : null}
    </section>
  );
}
