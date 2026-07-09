import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown } from "lucide-react";
import { useMediaQuery } from "../hooks/useMediaQuery";

export interface VirtualColumn<T extends Record<string, unknown>> {
  key: string;
  label: string;
  width?: string;
  className?: string;
  /** Prefer this column in the mobile card primary strip (lower = earlier). */
  mobilePriority?: number;
  /** Shorthand: include in the mobile card summary (ranked ahead of defaults). */
  mobilePrimary?: boolean;
  render?: (row: T) => ReactNode;
}

interface VirtualizedTableProps<T extends Record<string, unknown>> {
  items: T[];
  columns: VirtualColumn<T>[];
  rowHeight?: number;
  maxHeight?: string;
  scrollThreshold?: number;
  getRowKey?: (row: T, index: number) => string;
  className?: string;
  selectedIndex?: number | null;
  onRowClick?: (row: T, index: number) => void;
  measureDynamic?: boolean;
}

const ACTION_KEYS = new Set(["_why", "_dive"]);

const DEFAULT_MOBILE_PRIORITY: Record<string, number> = {
  symbol: 0,
  asset: 0,
  market: 0,
  matchup: 0,
  actor: 1,
  politician: 1,
  side: 2,
  transaction: 2,
  amountUsd: 3,
  amount: 3,
  premium: 3,
  shares: 4,
  price: 5,
  timestamp: 6,
  time: 6,
};

function columnMobileRank<T extends Record<string, unknown>>(
  col: VirtualColumn<T>,
  index: number
): number {
  if (typeof col.mobilePriority === "number") return col.mobilePriority;
  if (col.mobilePrimary) return index;
  return DEFAULT_MOBILE_PRIORITY[col.key] ?? 50;
}

function splitColumns<T extends Record<string, unknown>>(columns: VirtualColumn<T>[]) {
  const content = columns.filter((c) => !ACTION_KEYS.has(c.key));
  const actions = columns.filter((c) => ACTION_KEYS.has(c.key));
  const hasExplicit = content.some((c) => c.mobilePrimary || typeof c.mobilePriority === "number");
  const ranked = [...content].sort((a, b) => {
    if (hasExplicit) {
      const aExplicit = Boolean(a.mobilePrimary || typeof a.mobilePriority === "number");
      const bExplicit = Boolean(b.mobilePrimary || typeof b.mobilePriority === "number");
      if (aExplicit !== bExplicit) return aExplicit ? -1 : 1;
    }
    return (
      columnMobileRank(a, content.indexOf(a)) - columnMobileRank(b, content.indexOf(b))
    );
  });
  const primary = ranked.slice(0, 4);
  const primaryKeys = new Set(primary.map((c) => c.key));
  const secondary = content.filter((c) => !primaryKeys.has(c.key));
  return { primary, secondary, actions };
}

function cellValue<T extends Record<string, unknown>>(col: VirtualColumn<T>, row: T): ReactNode {
  return col.render ? col.render(row) : String(row[col.key] ?? "—");
}

export function VirtualizedTable<T extends Record<string, unknown>>({
  items,
  columns,
  rowHeight = 44,
  maxHeight = "min(28rem, 62vh)",
  scrollThreshold = 10,
  getRowKey = (row, index) => String(row.id ?? index),
  className = "",
  selectedIndex = null,
  onRowClick,
  measureDynamic = true,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 900px)");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const gridCols = columns.map((c) => c.width ?? "minmax(0, 1fr)").join(" ");
  const mobileRowHeight = 96;
  const effectiveRowHeight = isMobile ? mobileRowHeight : rowHeight;
  const contentHeight = Math.max(items.length * effectiveRowHeight, effectiveRowHeight);
  const needsScroll = items.length > scrollThreshold;
  const { primary, secondary, actions } = splitColumns(columns);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => effectiveRowHeight,
    overscan: 10,
    measureElement: measureDynamic
      ? (el) => el?.getBoundingClientRect().height ?? effectiveRowHeight
      : undefined,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const useFallback = items.length > 0 && virtualRows.length === 0;

  useLayoutEffect(() => {
    virtualizer.measure();
  }, [items.length, isMobile, expanded]);

  const scrollStyle: CSSProperties = needsScroll
    ? { maxHeight, height: maxHeight }
    : { height: contentHeight, overflowY: "hidden" };

  function rowClass(index: number) {
    return `vtable-row vtable-body-row ${isMobile ? "vtable-card-row" : ""} ${onRowClick ? "vtable-row-clickable" : ""} ${selectedIndex === index ? "selected" : ""}`.trim();
  }

  function toggleExpand(key: string, e: MouseEvent | KeyboardEvent) {
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function renderDesktopCells(row: T) {
    return columns.map((c) => (
      <div
        key={c.key}
        className={`vtable-cell ${c.className ?? ""}`.trim()}
        data-label={c.label}
      >
        {cellValue(c, row)}
      </div>
    ));
  }

  function renderMobileCard(row: T, key: string) {
    const isOpen = Boolean(expanded[key]);
    const titleCol = primary[0];
    const restPrimary = primary.slice(1);

    return (
      <>
        <div className="vtable-card-top">
          <div className="vtable-card-main">
            {titleCol ? (
              <div className="vtable-card-title">{cellValue(titleCol, row)}</div>
            ) : null}
            {restPrimary.length > 0 ? (
              <div className="vtable-card-badges">
                {restPrimary.map((c) => (
                  <div key={c.key} className={`vtable-card-field ${c.className ?? ""}`.trim()}>
                    {c.label ? <span className="vtable-card-field-label">{c.label}</span> : null}
                    <span className="vtable-card-field-value">{cellValue(c, row)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {actions.length > 0 ? (
            <div className="vtable-card-actions" onClick={(e) => e.stopPropagation()}>
              {actions.map((c) => (
                <div key={c.key} className={`vtable-cell vtable-card-action ${c.className ?? ""}`.trim()}>
                  {cellValue(c, row)}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {secondary.length > 0 ? (
          <div className="vtable-card-footer">
            <button
              type="button"
              className={`vtable-card-expand ${isOpen ? "open" : ""}`}
              aria-expanded={isOpen}
              onClick={(e) => toggleExpand(key, e)}
            >
              <ChevronDown size={16} />
              {isOpen ? "Hide details" : "Details"}
            </button>
            {isOpen ? (
              <div className="vtable-card-details">
                {secondary.map((c) => (
                  <div key={c.key} className={`vtable-card-detail ${c.className ?? ""}`.trim()}>
                    <span className="vtable-card-detail-label">{c.label || c.key}</span>
                    <span className="vtable-card-detail-value">{cellValue(c, row)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className={`vtable-wrap ${isMobile ? "vtable-mobile" : ""} ${className}`.trim()}>
      <div
        className="vtable"
        style={isMobile ? undefined : ({ "--vtable-cols": gridCols } as CSSProperties)}
      >
        {!isMobile ? (
          <div className="vtable-head">
            <div className="vtable-row vtable-head-row">
              {columns.map((c) => (
                <div key={c.key} className={`vtable-cell vtable-th ${c.className ?? ""}`.trim()}>
                  {c.label}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div ref={parentRef} className="vtable-scroll" style={scrollStyle}>
          <div
            className="vtable-body"
            style={
              useFallback
                ? undefined
                : { height: `${virtualizer.getTotalSize()}px`, position: "relative" }
            }
          >
            {useFallback
              ? items.map((row, i) => {
                  const key = getRowKey(row, i);
                  return (
                    <div
                      key={key}
                      className={rowClass(i)}
                      onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                      onKeyDown={onRowClick ? (e) => e.key === "Enter" && onRowClick(row, i) : undefined}
                      role={onRowClick ? "button" : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                    >
                      {isMobile ? renderMobileCard(row, key) : renderDesktopCells(row)}
                    </div>
                  );
                })
              : virtualRows.map((vRow) => {
                  const row = items[vRow.index];
                  const key = getRowKey(row, vRow.index);
                  return (
                    <div
                      key={key}
                      data-index={vRow.index}
                      ref={measureDynamic ? virtualizer.measureElement : undefined}
                      className={rowClass(vRow.index)}
                      onClick={onRowClick ? () => onRowClick(row, vRow.index) : undefined}
                      onKeyDown={
                        onRowClick
                          ? (e) => e.key === "Enter" && onRowClick(row, vRow.index)
                          : undefined
                      }
                      role={onRowClick ? "button" : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        ...(measureDynamic ? {} : { height: `${vRow.size}px` }),
                        transform: `translateY(${vRow.start}px)`,
                      }}
                    >
                      {isMobile ? renderMobileCard(row, key) : renderDesktopCells(row)}
                    </div>
                  );
                })}
          </div>
        </div>
      </div>
    </div>
  );
}
