import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
interface VirtualizedScoopListProps<T> {
  items: T[]; renderItem: (item: T, index: number) => ReactNode;
  estimateRowHeight?: number; maxHeight?: string; scrollThreshold?: number;
  getItemKey?: (item: T, index: number) => string; className?: string; measureDynamic?: boolean;
}
export function VirtualizedScoopList<T>({ items, renderItem, estimateRowHeight = 72,
  maxHeight = "min(24rem, 55vh)", scrollThreshold = 8,
  getItemKey = (_item, index) => String(index), className = "", measureDynamic = true,
}: VirtualizedScoopListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const needsVirtualization = items.length > scrollThreshold;
  const virtualizer = useVirtualizer({
    count: needsVirtualization ? items.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight, overscan: 8,
    measureElement: measureDynamic ? (el) => el?.getBoundingClientRect().height ?? estimateRowHeight : undefined,
  });
  useLayoutEffect(() => { virtualizer.measure(); }, [items.length, needsVirtualization, virtualizer]);
  // Short feeds use natural document height. Fixed estimates clipped Add/Why
  // actions as copy wrapped, especially on mobile and with larger text settings.
  if (!needsVirtualization) return <div ref={parentRef} className={`scoop-list-scroll ${className}`.trim()} style={{ maxHeight, overflowY: "auto" }}>
    <div className="scoop-list-inner">{items.map((item, index) => <div key={getItemKey(item, index)} className="scoop-list-item">{renderItem(item, index)}</div>)}</div>
  </div>;
  const virtualItems = virtualizer.getVirtualItems();
  const useFallback = items.length > 0 && virtualItems.length === 0;
  return <div ref={parentRef} className={`scoop-list-scroll ${className}`.trim()} style={{ maxHeight, height: maxHeight, overflowY: "auto" }}>
    <div className="scoop-list-inner" style={useFallback ? undefined : { height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
      {useFallback ? items.map((item, index) => <div key={getItemKey(item, index)} className="scoop-list-item">{renderItem(item, index)}</div>) : virtualItems.map((vItem) => <div key={getItemKey(items[vItem.index], vItem.index)} data-index={vItem.index}
        ref={measureDynamic ? virtualizer.measureElement : undefined} className="scoop-list-item"
        style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vItem.start}px)` }}>
        {renderItem(items[vItem.index], vItem.index)}
      </div>)}
    </div>
  </div>;
}
