import { BookOpen, X } from "lucide-react";
import type { SignalDetailPayload } from "../utils/signalIntel";
import { formatSignalShareText } from "../utils/shareSignal";
import { IntelActionBar } from "./IntelActionBar";

interface Props extends SignalDetailPayload {
  onClose: () => void;
}

export function SignalDetailModal({
  title,
  category,
  definition,
  example,
  contextLines,
  symbol,
  confidence,
  journalNote,
  journalMeta,
  onClose,
}: Props) {
  const shareText = formatSignalShareText({
    title,
    category,
    definition,
    contextLines,
    symbol,
    confidence,
  });

  return (
    <div className="modal-overlay signal-detail-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="signal-detail-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <header className="signal-detail-header">
          <div>
            <span className="signal-detail-label">
              <BookOpen size={14} /> Signal intel
            </span>
            <h3>
              {symbol ? `$${symbol} · ` : ""}
              {title}
            </h3>
            <span className="signal-detail-cat">{category}</span>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        {confidence != null && (
          <p className="signal-detail-confidence">
            Signal strength: <strong>{confidence}%</strong> — algorithmic assessment, not a prediction.
          </p>
        )}

        <p className="signal-detail-def">{definition}</p>

        {example && <p className="signal-detail-example">Example: {example}</p>}

        {contextLines && contextLines.length > 0 && (
          <ul className="signal-detail-context">
            {contextLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}

        <IntelActionBar
          shareText={shareText}
          journalNote={journalNote ?? shareText.split("\n").slice(0, 3).join(" · ")}
          journalMeta={journalMeta}
        />

        <p className="signal-detail-footer">Educational intel only — not financial advice.</p>
      </div>
    </div>
  );
}
