import type { ReactNode } from "react";

interface ItemCardProps {
  onClick?: () => void;
  title?: string;
  symbol: ReactNode;
  name?: ReactNode;
  price?: ReactNode;
  change?: number | null;
  changeLabel?: string;
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
}

function pctClass(change: number | null | undefined) {
  if (change == null || Number.isNaN(change)) return "flat";
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

function formatPct(change: number | null | undefined, label?: string) {
  if (label) return label;
  if (change == null || Number.isNaN(change)) return "—";
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

/** Mobile-first list card used across module desks (mockup style). */
export function ModuleItemCard({
  onClick,
  title,
  symbol,
  name,
  price,
  change,
  changeLabel,
  meta,
  children,
  className = "",
}: ItemCardProps) {
  const body = (
    <>
      <div className="mf-item-left">
        <div className="mf-item-symbol">{symbol}</div>
        {name != null && <div className="mf-item-name">{name}</div>}
        {children}
      </div>
      <div className="mf-item-right">
        {price != null && <div className="mf-item-price">{price}</div>}
        {(change != null || changeLabel) && (
          <span className={`mf-pct-badge ${pctClass(change)}`}>
            {formatPct(change, changeLabel)}
          </span>
        )}
        {meta != null && <div className="mf-item-name">{meta}</div>}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`mf-item-card ${className}`.trim()}
        onClick={onClick}
        title={title}
      >
        {body}
      </button>
    );
  }

  return <div className={`mf-item-card ${className}`.trim()}>{body}</div>;
}

interface SummaryCardProps {
  label: string;
  value: ReactNode;
  delta?: number | null;
  deltaLabel?: string;
  subtitle?: ReactNode;
}

export function ModuleSummaryCard({ label, value, delta, deltaLabel, subtitle }: SummaryCardProps) {
  const cls = pctClass(delta);
  return (
    <div className="mf-summary-card">
      <div className="mf-summary-label">{label}</div>
      <div className="mf-summary-value">{value}</div>
      {(delta != null || deltaLabel) && (
        <div className={`mf-summary-delta ${cls}`}>
          {deltaLabel ?? formatPct(delta)}
        </div>
      )}
      {subtitle != null && <div className="mf-summary-sub">{subtitle}</div>}
    </div>
  );
}
