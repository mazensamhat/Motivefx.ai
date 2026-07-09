import { ActivityPanel, formatPrice, formatShares, formatTime, formatUsd } from "./ActivityPanel";
import {
  DATE_FROM_FILTER,
  DATE_TO_FILTER,
  SIDE_FILTER,
  STOCK_PRICE_FILTERS,
} from "./activityFilters";

function sideBadgeClass(side: unknown): string {
  const s = String(side ?? "").toLowerCase();
  if (s === "buy") return "bullish";
  if (s === "sell") return "bearish";
  return "neutral";
}

const STOCK_FILTERS = [
  { key: "symbol", label: "Symbol", type: "text" as const, placeholder: "NVDA", param: "symbol" },
  SIDE_FILTER,
  DATE_FROM_FILTER,
  DATE_TO_FILTER,
  { key: "min_shares", label: "Min shares", type: "number" as const, placeholder: "10000", param: "min_shares" },
  ...STOCK_PRICE_FILTERS,
];

export function StockActivityPanel() {
  return (
    <ActivityPanel
      module="trades"
      title="Stock Activity"
      subtitle="Who's buying and selling — block and insider flow."
      endpoint="/stocks/activity"
      filters={STOCK_FILTERS}
      emptyMessage="No stock buys or sells yet. Check back as markets move."
      columns={[
        { key: "timestamp", label: "Time", render: (r) => formatTime(r.timestamp) },
        { key: "actor", label: "Who", mobilePrimary: true, mobilePriority: 0 },
        {
          key: "side",
          label: "Side",
          mobilePrimary: true,
          mobilePriority: 1,
          render: (r) => (
            <span className={`badge badge-${sideBadgeClass(r.side)}`}>
              {String(r.side).toUpperCase()}
            </span>
          ),
        },
        {
          key: "amountUsd",
          label: "Amount",
          mobilePrimary: true,
          mobilePriority: 2,
          render: (r) => formatUsd(r.amountUsd),
        },
        {
          key: "symbol",
          label: "Symbol",
          mobilePrimary: true,
          mobilePriority: 3,
          render: (r) => <strong>${String(r.symbol)}</strong>,
        },
        { key: "price", label: "Price", render: (r) => formatPrice(r.price) },
        { key: "shares", label: "Shares", render: (r) => formatShares(r.shares) },
        { key: "note", label: "Detail", render: (r) => <span className="cell-note">{String(r.note ?? "")}</span> },
      ]}
      buildWhy={(r) => ({
        title: `${String(r.side).toUpperCase()} flow on $${r.symbol}`,
        symbol: String(r.symbol),
        confidence: 74,
        reasons: [
          String(r.note || "Block trade flagged on Trades activity feed."),
          `${formatShares(r.shares)} shares at ${formatPrice(r.price)} — ${formatUsd(r.amountUsd)} notional.`,
          `${String(r.actor)} side: ${String(r.side).toUpperCase()}. Informational context only.`,
        ],
        signals: ["Block Flow", String(r.side).toUpperCase()],
      })}
    />
  );
}
