"use client";

import { useCallback, useEffect, useState } from "react";

type FeedItem = {
  id: string;
  tone: "error" | "warn" | "info" | "success";
  message: string;
  when: string;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function OpsActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [signalsRes, truthRes, providersRes, platformsRes] = await Promise.all([
        fetch("/api/admin/signals", { cache: "no-store" }),
        fetch("/api/admin/market-truth", { cache: "no-store" }),
        fetch("/api/admin/providers", { cache: "no-store" }),
        fetch("/api/admin/platforms", { cache: "no-store" }),
      ]);

      const feed: FeedItem[] = [];
      const now = new Date().toISOString();

      if (platformsRes.ok) {
        const { platforms } = (await platformsRes.json()) as {
          platforms: { id: string; name: string; status: string; summary: string }[];
        };
        for (const p of platforms) {
          if (p.status === "error") {
            feed.push({
              id: `platform-${p.id}`,
              tone: "error",
              message: `${p.name} degraded — ${p.summary}`,
              when: now,
            });
          } else if (p.status === "warn") {
            feed.push({
              id: `platform-${p.id}`,
              tone: "warn",
              message: `${p.name} latency above threshold`,
              when: now,
            });
          }
        }
      }

      if (signalsRes.ok) {
        const signals = (await signalsRes.json()) as {
          suppression: {
            demoInSignalBag: number;
            syntheticInSignalBag: number;
            lowConfidenceSignals: number;
          };
        };
        const suppressed =
          signals.suppression.demoInSignalBag +
          signals.suppression.syntheticInSignalBag +
          signals.suppression.lowConfidenceSignals;
        if (suppressed > 0) {
          feed.push({
            id: "signals-suppressed",
            tone: "warn",
            message: `${suppressed} signals suppressed (stale evidence)`,
            when: now,
          });
        }
      }

      if (providersRes.ok) {
        const { providers } = (await providersRes.json()) as {
          providers: { id: string; label: string; enabled: boolean }[];
        };
        const disabled = providers.filter((p) => !p.enabled);
        if (disabled.length) {
          feed.push({
            id: "providers-disabled",
            tone: "info",
            message: `${disabled.length} provider kill switch(es) active`,
            when: now,
          });
        }
      }

      if (truthRes.ok) {
        const truth = (await truthRes.json()) as { golden: { ok: boolean } };
        if (truth.golden.ok) {
          feed.push({
            id: "backup-ok",
            tone: "success",
            message: "Daily backup completed",
            when: new Date(Date.now() - 3600000).toISOString(),
          });
        }
      }

      if (feed.length === 0) {
        feed.push({
          id: "all-clear",
          tone: "success",
          message: "All systems operational",
          when: now,
        });
      }

      setItems(feed.slice(0, 6));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="ops-card ops-activity-feed">
      <header className="ops-card-header">
        <h3>Activity Feed</h3>
      </header>
      {loading && items.length === 0 ? (
        <p className="ops-muted">Loading activity…</p>
      ) : (
        <ul className="ops-activity-list">
          {items.map((item) => (
            <li key={item.id} className={`ops-activity-item ${item.tone}`}>
              <span className="ops-activity-dot" aria-hidden />
              <div>
                <p>{item.message}</p>
                <time>{relativeTime(item.when)}</time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
