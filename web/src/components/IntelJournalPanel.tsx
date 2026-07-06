import { NotebookPen, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useIntelJournal } from "../hooks/useIntelJournal";
import { useSignalDetail } from "../hooks/useSignalDetail";
import { resolveSignalDetail } from "../utils/signalIntel";
import type { IntelJournalEntry } from "../types";

const MODULES = ["", "trades", "penny", "crypto", "betting", "predictions"];

export function IntelJournalPanel() {
  const { isAuthenticated, openAuth } = useAuth();
  const { entries, addEntry, removeEntry } = useIntelJournal();
  const { inspectDetail } = useSignalDetail();
  const sectionRef = useRef<HTMLElement>(null);
  const [note, setNote] = useState("");
  const [symbol, setSymbol] = useState("");
  const [filterSymbol, setFilterSymbol] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [highlight, setHighlight] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const scrollToJournal = () => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setHighlight(true);
      window.setTimeout(() => setHighlight(false), 2400);
    };
    window.addEventListener("motivefx:journal-scroll", scrollToJournal);
    return () => window.removeEventListener("motivefx:journal-scroll", scrollToJournal);
  }, []);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterModule && e.module !== filterModule) return false;
      if (filterSymbol && !(e.symbol ?? "").toUpperCase().includes(filterSymbol.toUpperCase())) return false;
      return true;
    });
  }, [entries, filterModule, filterSymbol]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    if (!isAuthenticated) {
      openAuth("register");
      return;
    }
    setSaving(true);
    try {
      await addEntry(note.trim(), symbol.trim() ? { symbol: symbol.trim().toUpperCase() } : undefined);
      setNote("");
      setSymbol("");
    } finally {
      setSaving(false);
    }
  }

  function openEntry(entry: IntelJournalEntry) {
    inspectDetail(
      resolveSignalDetail(entry.signalTitle ?? "Journal note", {
        symbol: entry.symbol ?? undefined,
        category: "Paper Intel Journal",
        contextLines: [entry.note, entry.module ? `Module: ${entry.module}` : ""].filter(Boolean),
        journalNote: entry.note,
        journalMeta: {
          module: entry.module ?? undefined,
          symbol: entry.symbol ?? undefined,
          signalTitle: entry.signalTitle ?? undefined,
        },
      })
    );
  }

  return (
    <section
      ref={sectionRef}
      id="intel-journal"
      className={`intel-journal glass-card ${highlight ? "intel-journal-highlight" : ""}`}
    >
      <header className="intel-journal-header">
        <h2>
          <NotebookPen size={18} /> Paper Intel Journal
        </h2>
        <span className="intel-journal-sub">Private notes on signals — click an entry to reopen intel</span>
      </header>

      <div className="intel-journal-filters">
        <input
          placeholder="Filter symbol…"
          value={filterSymbol}
          onChange={(e) => setFilterSymbol(e.target.value)}
          aria-label="Filter by symbol"
        />
        <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} aria-label="Filter by module">
          <option value="">All modules</option>
          {MODULES.filter(Boolean).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <form className="intel-journal-form" onSubmit={handleSubmit}>
        <input
          placeholder="Symbol (optional)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="intel-journal-symbol"
        />
        <input
          placeholder="Watching for volume confirm…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-sm btn-accent-terminal" disabled={saving || !note.trim()}>
          {saving ? "Saving…" : "Log note"}
        </button>
      </form>
      {filtered.length === 0 ? (
        <p className="intel-journal-empty">
          {entries.length === 0
            ? "No journal entries yet — log what you're watching or save from any signal detail."
            : "No entries match your filters."}
        </p>
      ) : (
        <ul className="intel-journal-list">
          {filtered.map((e) => (
            <li key={e.id}>
              <button type="button" className="intel-journal-entry-btn" onClick={() => openEntry(e)}>
                <div className="intel-journal-entry-top">
                  {e.symbol && <strong>${e.symbol}</strong>}
                  {e.module && <span className="intel-journal-mod">{e.module}</span>}
                  {e.signalTitle && <span>{e.signalTitle}</span>}
                </div>
                <p>{e.note}</p>
              </button>
              <button
                type="button"
                className="btn-icon intel-journal-delete"
                aria-label="Delete entry"
                onClick={() => removeEntry(e.id)}
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
