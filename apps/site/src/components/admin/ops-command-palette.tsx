"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { OPS_NAV } from "@/components/admin/ops-nav";

type SearchHit = {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  href: string;
};

export function OpsCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [remoteHits, setRemoteHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const navHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return OPS_NAV.filter((i) => !i.external).slice(0, 8).map((item) => ({
        id: `nav-${item.id}`,
        kind: "nav",
        title: item.label,
        subtitle: item.description,
        href: item.href,
      }));
    }
    return OPS_NAV.filter(
      (item) =>
        !item.external &&
        (item.label.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.id.includes(q))
    )
      .slice(0, 8)
      .map((item) => ({
        id: `nav-${item.id}`,
        kind: "nav",
        title: item.label,
        subtitle: item.description,
        href: item.href,
      }));
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("ops:open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("ops:open-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setRemoteHits([]);
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setRemoteHits([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const body = (await res.json()) as { hits: SearchHit[] };
          setRemoteHits(body.hits ?? []);
        }
      } catch {
        /* ignore */
      }
    }, 180);
    return () => window.clearTimeout(handle);
  }, [query, open]);

  const hits = useMemo(() => {
    const seen = new Set<string>();
    const merged: SearchHit[] = [];
    for (const h of [...navHits, ...remoteHits]) {
      if (seen.has(h.id)) continue;
      seen.add(h.id);
      merged.push(h);
    }
    return merged.slice(0, 20);
  }, [navHits, remoteHits]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  useEffect(() => {
    setActive(0);
  }, [hits.length, query]);

  if (!open) return null;

  return (
    <div
      className="ops-palette-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Ops command palette"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="ops-palette">
        <div className="ops-palette-input-row">
          <Search className="ops-palette-search-icon" aria-hidden />
          <input
            ref={inputRef}
            className="ops-palette-input"
            placeholder="Search users, symbols, providers, pages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && hits[active]) {
                e.preventDefault();
                go(hits[active]!.href);
              }
            }}
          />
          <kbd className="ops-palette-kbd">Esc</kbd>
        </div>
        <ul className="ops-palette-list">
          {hits.length === 0 ? (
            <li className="ops-palette-empty">No matches</li>
          ) : (
            hits.map((hit, index) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className={`ops-palette-item${index === active ? " active" : ""}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(hit.href)}
                >
                  <span className="ops-palette-kind">{hit.kind}</span>
                  <span className="ops-palette-title">{hit.title}</span>
                  {hit.subtitle ? <span className="ops-palette-sub">{hit.subtitle}</span> : null}
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="ops-palette-hint">
          <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd> · Navigate with arrows · Enter to open
        </p>
      </div>
    </div>
  );
}
