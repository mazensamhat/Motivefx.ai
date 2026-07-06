import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export interface VirtualColumn<T extends Record<string, unknown>> {
  key: string;
  label: string;
  width?: string;
  className?: string;
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
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const gridCols = columns.map((c) => c.width ?? "minmax(0, 1fr)").join(" ");
  const contentHeight = Math.max(items.length * rowHeight, rowHeight);
  const needsScroll = items.length > scrollThreshold;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const useFallback = items.length > 0 && virtualRows.length === 0;

  useLayoutEffect(() => {
    virtualizer.measure();
  }, [items.length]);

  const scrollStyle: CSSProperties = needsScroll
    ? { maxHeight, height: maxHeight }
    : { height: contentHeight, overflowY: "hidden" };

  function rowClass(index: number) {
    return `vtable-row vtable-body-row ${onRowClick ? "vtable-row-clickable" : ""} ${selectedIndex === index ? "selected" : ""}`.trim();
  }

  return (
    <div className={`vtable-wrap ${className}`.trim()}>
      <div
        className="vtable"
        style={{ "--vtable-cols": gridCols } as CSSProperties}
      >
        <div className="vtable-head">
          <div className="vtable-row vtable-head-row">
            {columns.map((c) => (
              <div key={c.key} className={`vtable-cell vtable-th ${c.className ?? ""}`.trim()}>
                {c.label}
              </div>
            ))}
          </div>
        </div>
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
              ? items.map((row, i) => (
                  <div
                    key={getRowKey(row, i)}
                    className={rowClass(i)}
                    onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                    onKeyDown={onRowClick ? (e) => e.key === "Enter" && onRowClick(row, i) : undefined}
                    role={onRowClick ? "button" : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                  >
                    {columns.map((c) => (
                      <div key={c.key} className={`vtable-cell ${c.className ?? ""}`.trim()}>
                        {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                      </div>
                    ))}
                  </div>
                ))
              : virtualRows.map((vRow) => {
                  const row = items[vRow.index];
                  return (
                    <div
                      key={getRowKey(row, vRow.index)}
                      className={rowClass(vRow.index)}
                      onClick={onRowClick ? () => onRowClick(row, vRow.index) : undefined}
                      onKeyDown={onRowClick ? (e) => e.key === "Enter" && onRowClick(row, vRow.index) : undefined}
                      role={onRowClick ? "button" : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${vRow.size}px`,
                        transform: `translateY(${vRow.start}px)`,
                      }}
                    >
                      {columns.map((c) => (
                        <div key={c.key} className={`vtable-cell ${c.className ?? ""}`.trim()}>
                          {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                        </div>
                      ))}
                    </div>
                  );
                })}
          </div>
        </div>
      </div>
    </div>
  );
}
