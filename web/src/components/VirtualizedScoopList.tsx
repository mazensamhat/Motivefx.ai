import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualizedScoopListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  estimateRowHeight?: number;
  maxHeight?: string;
  scrollThreshold?: number;
  getItemKey?: (item: T, index: number) => string;
  className?: string;
  measureDynamic?: boolean;
}

export function VirtualizedScoopList<T>({
  items,
  renderItem,
  estimateRowHeight = 72,
  maxHeight = "min(24rem, 55vh)",
  scrollThreshold = 8,
  getItemKey = (_item, index) => String(index),
  className = "",
  measureDynamic = true,
}: VirtualizedScoopListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const contentHeight = Math.max(items.length * estimateRowHeight, estimateRowHeight);
  const needsScroll = items.length > scrollThreshold;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 8,
    measureElement: measureDynamic
      ? (el) => el?.getBoundingClientRect().height ?? estimateRowHeight
      : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const useFallback = items.length > 0 && virtualItems.length === 0;

  useLayoutEffect(() => {
    virtualizer.measure();
  }, [items.length]);

  const scrollStyle: CSSProperties = needsScroll
    ? { maxHeight, height: maxHeight }
    : { height: contentHeight, overflowY: "hidden" };

  return (
    <div
      ref={parentRef}
      className={`scoop-list-scroll ${className}`.trim()}
      style={scrollStyle}
    >
      <div
        className="scoop-list-inner"
        style={
          useFallback
            ? undefined
            : { height: `${virtualizer.getTotalSize()}px`, position: "relative" }
        }
      >
        {useFallback
          ? items.map((item, index) => (
              <div key={getItemKey(item, index)} className="scoop-list-item">
                {renderItem(item, index)}
              </div>
            ))
          : virtualItems.map((vItem) => {
              const item = items[vItem.index];
              return (
                <div
                  key={getItemKey(item, vItem.index)}
                  data-index={vItem.index}
                  ref={measureDynamic ? virtualizer.measureElement : undefined}
                  className="scoop-list-item"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${vItem.start}px)`,
                  }}
                >
                  {renderItem(item, vItem.index)}
                </div>
              );
            })}
      </div>
    </div>
  );
}
