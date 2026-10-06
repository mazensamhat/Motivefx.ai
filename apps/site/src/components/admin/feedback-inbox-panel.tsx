"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  status: string;
  priority: string;
  assignedTo: string | null;
  internalNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: { email: string; name: string | null };
};

type Counts = { total: number; open: number; urgent: number; resolved: number };

export function FeedbackInboxPanel() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, open: 0, urgent: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "all" | "resolved">("open");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feedback", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { feedback: FeedbackItem[]; counts: Counts };
        setItems(data.feedback ?? []);
        setCounts(data.counts ?? { total: 0, open: 0, urgent: 0, resolved: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () =>
      items.filter((item) => {
        const resolved = item.status === "resolved" || item.status === "closed";
        if (filter === "open") return !resolved;
        if (filter === "resolved") return resolved;
        return true;
      }),
    [items, filter]
  );

  async function update(id: string, patch: Record<string, string | null>) {
    const res = await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (res.ok) await load();
  }

  return (
    <section className="admin-panel app-panel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-[#00e676]" />
            <h2>Support Center</h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {counts.open} open · {counts.urgent} urgent · {counts.resolved} resolved · {counts.total} total
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["open", "all", "resolved"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`admin-btn ${filter === value ? "active" : ""}`}
              onClick={() => setFilter(value)}
            >
              {value}
            </button>
          ))}
          <button type="button" className="admin-btn" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-slate-400">No support items in this view.</p>
      ) : (
        <ul className="max-h-[640px] space-y-3 overflow-y-auto">
          {visible.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-[var(--border)] bg-[rgba(8,10,12,0.6)] p-4 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white">{KIND_LABELS[item.kind] ?? item.kind}</span>
                  <span className="ops-intel-pill">{item.status}</span>
                  <span className={`ops-intel-pill ${item.priority === "urgent" ? "critical" : item.priority === "high" ? "degraded" : ""}`}>
                    {item.priority}
                  </span>
                </div>
                <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</span>
              </div>

              <p className="mt-2 whitespace-pre-wrap text-slate-300">{item.message}</p>
              <p className="mt-2 text-xs text-slate-500">
                {item.user.email} · {item.pagePath ?? "—"} · assigned {item.assignedTo ?? "unassigned"}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <select
                  className="admin-input"
                  value={item.status}
                  onChange={(e) => void update(item.id, { status: e.target.value })}
                  aria-label="Support status"
                >
                  <option value="new">New</option>
                  <option value="triaged">Triaged</option>
                  <option value="in_progress">In progress</option>
                  <option value="waiting">Waiting</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  className="admin-input"
                  value={item.priority}
                  onChange={(e) => void update(item.id, { priority: e.target.value })}
                  aria-label="Support priority"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <input
                  className="admin-input"
                  placeholder="Assign to email/name"
                  defaultValue={item.assignedTo ?? ""}
                  onBlur={(e) =>
                    void update(item.id, { assignedTo: e.target.value.trim() || null })
                  }
                />
              </div>

              <textarea
                className="admin-input mt-2 w-full"
                rows={2}
                placeholder="Internal note"
                defaultValue={item.internalNote ?? ""}
                onBlur={(e) =>
                  void update(item.id, { internalNote: e.target.value.trim() || null })
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
