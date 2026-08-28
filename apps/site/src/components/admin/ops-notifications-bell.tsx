"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

type NotifyItem = {
  id: string;
  severity: string;
  title: string;
  detail?: string;
  href?: string;
};

export function OpsNotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [commandRes, incidentsRes] = await Promise.all([
        fetch("/api/admin/command", { cache: "no-store" }),
        fetch("/api/admin/incidents", { cache: "no-store" }),
      ]);
      const next: NotifyItem[] = [];
      if (commandRes.ok) {
        const body = (await commandRes.json()) as {
          items?: { id: string; severity: string; title: string; detail?: string; href?: string }[];
        };
        for (const item of body.items ?? []) {
          if (item.severity === "ok") continue;
          next.push({
            id: `attn-${item.id}`,
            severity: item.severity,
            title: item.title,
            detail: item.detail,
            href: item.href,
          });
        }
      }
      if (incidentsRes.ok) {
        const body = (await incidentsRes.json()) as {
          incidents?: {
            id: string;
            severity: string;
            title: string;
            description?: string;
            status: string;
            href?: string;
          }[];
        };
        for (const inc of body.incidents ?? []) {
          if (inc.status === "resolved") continue;
          next.push({
            id: `inc-${inc.id}`,
            severity: inc.severity.toLowerCase(),
            title: inc.title,
            detail: inc.description,
            href: inc.href ?? "/admin/incidents",
          });
        }
      }
      // Dedupe by title
      const seen = new Set<string>();
      setItems(
        next.filter((n) => {
          if (seen.has(n.title)) return false;
          seen.add(n.title);
          return true;
        })
      );
    } catch {
      /* non-blocking */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const count = items.length;

  return (
    <div className="ops-notify-root" ref={rootRef}>
      <button
        type="button"
        className="ops-toolbar-btn icon-only"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
      >
        <Bell className="h-4 w-4" />
        {count > 0 ? <span className="ops-notify-badge">{count > 9 ? "9+" : count}</span> : null}
      </button>
      {open ? (
        <div className="ops-notify-panel" role="dialog" aria-label="Ops notifications">
          <header className="ops-notify-panel-header">
            <strong>Notifications</strong>
            <span className="ops-muted">{loading ? "Refreshing…" : `${count} open`}</span>
          </header>
          {count === 0 ? (
            <p className="ops-muted ops-notify-empty">Nothing requires attention.</p>
          ) : (
            <ul className="ops-notify-list">
              {items.slice(0, 12).map((item) => (
                <li key={item.id} className={`ops-notify-item ${item.severity}`}>
                  {item.href ? (
                    <Link href={item.href} onClick={() => setOpen(false)}>
                      {item.title}
                    </Link>
                  ) : (
                    <span>{item.title}</span>
                  )}
                  {item.detail ? <p className="ops-muted">{item.detail}</p> : null}
                </li>
              ))}
            </ul>
          )}
          <footer className="ops-notify-panel-footer">
            <Link href="/admin/incidents" onClick={() => setOpen(false)}>
              Open incidents →
            </Link>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
