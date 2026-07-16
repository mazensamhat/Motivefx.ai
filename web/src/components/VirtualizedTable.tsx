import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from "lucide-react";
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
  /** When table sortable=true, allow header click (default true if label set). */
  sortable?: boolean;
  /** Optional accessor for sort value (defaults to row[key]). */
  sortValue?: (row: T) => string | number | null | undefined;
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
  /** Enable clickable column headers with asc/desc toggle. */
  sortable?: boolean;
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

function rawSortValue<T extends Record<string, unknown>>(
  col: VirtualColumn<T>,
  row: T
): string | number {
  if (col.sortValue) {
    const v = col.sortValue(row);
    if (v == null) return "";
    return typeof v === "number" ? v : String(v);
  }
  const v = row[col.key];
  if (v == null) return "";
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const n = Number(v);
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(v.trim())) {
    return n;
  }
  return String(v);
}

function compareSortValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
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
  sortable = false,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 900px)");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const gridCols = columns.map((c) => c.width ?? "minmax(0, 1fr)").join(" ");
  const mobileRowHeight = 96;
  const effectiveRowHeight = isMobile ? mobileRowHeight : rowHeight;
  const { primary, secondary, actions } = splitColumns(columns);

  const sortedItems = useMemo(() => {
    if (!sortable || !sortKey) return items;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return items;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...items].sort((ra, rb) => {
      const av = rawSortValue(col, ra);
      const bv = rawSortValue(col, rb);
      return compareSortValues(av, bv) * dir;
    });
  }, [items, columns, sortable, sortKey, sortDir]);

  const contentHeight = Math.max(sortedItems.length * effectiveRowHeight, effectiveRowHeight);
  const needsScroll = sortedItems.length > scrollThreshold;

  const virtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => effectiveRowHeight,
    overscan: 10,
    measureElement: measureDynamic
      ? (el) => el?.getBoundingClientRect().height ?? effectiveRowHeight
      : undefined,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const useFallback = sortedItems.length > 0 && virtualRows.length === 0;

  useLayoutEffect(() => {
    virtualizer.measure();
  }, [sortedItems.length, isMobile, expanded]);

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

  function columnIsSortable(col: VirtualColumn<T>): boolean {
    if (!sortable) return false;
    if (ACTION_KEYS.has(col.key)) return false;
    if (col.sortable === false) return false;
    return Boolean(col.label);
  }

  function onHeaderClick(col: VirtualColumn<T>) {
    if (!columnIsSortable(col)) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  }

  function sortIcon(col: VirtualColumn<T>) {
    if (!columnIsSortable(col)) return null;
    if (sortKey !== col.key) return <ArrowUpDown size={12} className="vtable-sort-icon muted" />;
    return sortDir === "asc" ? (
      <ArrowUp size={12} className="vtable-sort-icon active" />
    ) : (
      <ArrowDown size={12} className="vtable-sort-icon active" />
    );
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
              {columns.map((c) => {
                const canSort = columnIsSortable(c);
                return (
                  <div
                    key={c.key}
                    className={`vtable-cell vtable-th ${c.className ?? ""} ${canSort ? "vtable-th-sortable" : ""}`.trim()}
                    role={canSort ? "button" : undefined}
                    tabIndex={canSort ? 0 : undefined}
                    aria-sort={
                      canSort && sortKey === c.key
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : canSort
                          ? "none"
                          : undefined
                    }
                    onClick={canSort ? () => onHeaderClick(c) : undefined}
                    onKeyDown={
                      canSort
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onHeaderClick(c);
                            }
                          }
                        : undefined
                    }
                  >
                    <span className="vtable-th-label">
                      {c.label}
                      {sortIcon(c)}
                    </span>
                  </div>
                );
              })}
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
              ? sortedItems.map((row, i) => {
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
                  const row = sortedItems[vRow.index];
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
