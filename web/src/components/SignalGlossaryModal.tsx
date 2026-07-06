import { BookOpen, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SIGNAL_GLOSSARY, type GlossaryEntry } from "../config/signalGlossary";

interface Props {
  onClose: () => void;
}

export function SignalGlossaryModal({ onClose }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SIGNAL_GLOSSARY;
    return SIGNAL_GLOSSARY.filter(
      (e) =>
        e.term.toLowerCase().includes(q) ||
        e.definition.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="modal-overlay glossary-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="glossary-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <header className="glossary-header">
          <h2>
            <BookOpen size={20} /> Signal Glossary
          </h2>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <p className="glossary-sub">Educational definitions — informational context only, not advice.</p>
        <div className="glossary-search">
          <Search size={16} />
          <input
            placeholder="Search terms…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="glossary-list">
          {filtered.map((entry) => (
            <GlossaryCard key={entry.id} entry={entry} />
          ))}
          {filtered.length === 0 && <p className="empty">No terms match your search.</p>}
        </div>
      </div>
    </div>
  );
}

function GlossaryCard({ entry }: { entry: GlossaryEntry }) {
  return (
    <article className="glossary-card">
      <div className="glossary-card-top">
        <strong>{entry.term}</strong>
        <span className="glossary-cat">{entry.category}</span>
      </div>
      <p>{entry.definition}</p>
      {entry.example && <p className="glossary-example">Example: {entry.example}</p>}
    </article>
  );
}
