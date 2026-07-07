"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquarePlus, RefreshCw } from "lucide-react";

const KIND_LABELS: Record<string, string> = {
  bug: "Bug report",
  feature: "Feature request",
  billing: "Billing",
  other: "Other",
};

type FeedbackItem = {
  id: string;
  kind: string;
  message: string;
  pagePath: string | null;
  createdAt: string;
  user: { email: string; name: string | null };
};

export function FeedbackInboxPanel() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feedback", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { feedback: FeedbackItem[] };
        setItems(data.feedback ?? []);
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4 text-[#00e676]" />
          <h2>User feedback inbox</h2>
        </div>
        <button type="button" className="admin-btn" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      {loading && items.length === 0 ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">No feedback yet.</p>
      ) : (
        <ul className="max-h-[420px] space-y-3 overflow-y-auto">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-[var(--border)] bg-[rgba(8,10,12,0.6)] p-4 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-white">{KIND_LABELS[item.kind] ?? item.kind}</span>
                <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-slate-300">{item.message}</p>
              <p className="mt-2 text-xs text-slate-500">
                {item.user.email} · {item.pagePath ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
