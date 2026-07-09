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
      title="Stock Activity — Who's Buying & Selling"
      endpoint="/stocks/activity"
      filters={STOCK_FILTERS}
      emptyMessage="No stock activity for these filters."
      columns={[
        { key: "timestamp", label: "Time", render: (r) => formatTime(r.timestamp) },
        {
          key: "symbol",
          label: "Symbol",
          mobilePrimary: true,
          render: (r) => <strong>${String(r.symbol)}</strong>,
        },
        { key: "price", label: "Price", render: (r) => formatPrice(r.price) },
        { key: "actor", label: "Who", mobilePrimary: true },
        {
          key: "side",
          label: "Side",
          mobilePrimary: true,
          render: (r) => (
            <span className={`badge badge-${sideBadgeClass(r.side)}`}>
              {String(r.side).toUpperCase()}
            </span>
          ),
        },
        { key: "shares", label: "Shares", render: (r) => formatShares(r.shares) },
        {
          key: "amountUsd",
          label: "Amount",
          mobilePrimary: true,
          render: (r) => formatUsd(r.amountUsd),
        },
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
