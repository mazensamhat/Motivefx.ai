import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  primary: ReactNode;
  secondary?: ReactNode;
  meta?: ReactNode;
  detail?: ReactNode;
  tag?: { label: string; variant?: "buy" | "sell" | "neutral" | "bullish" | "bearish" };
  onClick?: () => void;
  actions?: ReactNode;
  selected?: boolean;
}

export function TerminalRow({
  primary,
  secondary,
  meta,
  detail,
  tag,
  onClick,
  actions,
  selected,
}: Props) {
  const [open, setOpen] = useState(false);
  const expandable = Boolean(detail);
  const interactive = expandable || Boolean(onClick);

  function handleMainClick() {
    if (expandable) {
      setOpen((o) => !o);
    }
    onClick?.();
  }

  return (
    <div
      className={`terminal-row ${open ? "expanded" : ""} ${interactive ? "clickable" : ""} ${selected ? "selected" : ""}`}
    >
      <div className="terminal-row-main">
        <button
          type="button"
          className="terminal-row-hit"
          onClick={interactive ? handleMainClick : undefined}
          disabled={!interactive}
        >
          <div className="terminal-row-body">
            {tag && (
              <span className={`terminal-tag terminal-tag-${tag.variant ?? "neutral"}`}>
                {tag.label}
              </span>
            )}
            <div className="terminal-row-primary">{primary}</div>
            {secondary && <div className="terminal-row-secondary">{secondary}</div>}
          </div>
          <div className="terminal-row-right">
            {meta && <div className="terminal-row-meta">{meta}</div>}
            {expandable && (
              <ChevronDown size={14} className={`terminal-chevron ${open ? "open" : ""}`} />
            )}
          </div>
        </button>
        {actions && <div className="terminal-row-actions">{actions}</div>}
      </div>
      {open && detail && <div className="terminal-row-detail">{detail}</div>}
    </div>
  );
}
