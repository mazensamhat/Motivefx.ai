import {
  ActivityPanel,
  formatPrice,
  formatShares,
  formatTime,
  formatUsd,
} from "./ActivityPanel";
import {
  DATE_FROM_FILTER,
  DATE_TO_FILTER,
  PENNY_PRICE_FILTERS,
  SIDE_FILTER,
} from "./activityFilters";

const PENNY_FILTERS = [
  { key: "symbol", label: "Symbol", type: "text" as const, placeholder: "SNDL", param: "symbol" },
  SIDE_FILTER,
  DATE_FROM_FILTER,
  DATE_TO_FILTER,
  { key: "min_shares", label: "Min shares", type: "number" as const, placeholder: "50000", param: "min_shares" },
  ...PENNY_PRICE_FILTERS,
];

export function PennyActivityPanel() {
  return (
    <ActivityPanel
      module="pinkslips"
      title="Pink Slip Activity — Who's Buying & Selling"
      endpoint="/penny/activity"
      filters={PENNY_FILTERS}
      emptyMessage="No pink slip flow for these filters."
      columns={[
        { key: "timestamp", label: "Time", render: (r) => formatTime(r.timestamp) },
        { key: "symbol", label: "Symbol", render: (r) => <strong>${String(r.symbol)}</strong> },
        { key: "price", label: "Price", render: (r) => formatPrice(r.price) },
        { key: "actor", label: "Who" },
        {
          key: "side",
          label: "Side",
          render: (r) => (
            <span className={`badge badge-${r.side === "buy" ? "bullish" : "bearish"}`}>
              {String(r.side).toUpperCase()}
            </span>
          ),
        },
        { key: "shares", label: "Shares", render: (r) => formatShares(r.shares) },
        { key: "amountUsd", label: "Amount", render: (r) => formatUsd(r.amountUsd) },
        { key: "note", label: "Detail", render: (r) => <span className="cell-note">{String(r.note ?? "")}</span> },
      ]}
      buildWhy={(r) => ({
        title: `${String(r.side).toUpperCase()} on $${r.symbol}`,
        symbol: String(r.symbol),
        confidence: 70,
        reasons: [
          String(r.note || "Pink slip flow detected on microcap scanner."),
          `${formatShares(r.shares)} shares at ${formatPrice(r.price)}.`,
          `${String(r.actor)} — ${String(r.side).toUpperCase()} block. Not a trade recommendation.`,
        ],
        signals: ["Pink Slip Flow", String(r.side).toUpperCase()],
      })}
    />
  );
}
