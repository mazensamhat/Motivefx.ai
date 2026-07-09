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

function sideBadgeClass(side: unknown): string {
  const s = String(side ?? "").toLowerCase();
  return s === "sell" ? "bearish" : "bullish";
}

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
      title="Pink Slip Activity"
      subtitle="Who's buying and selling — microcap flow."
      endpoint="/penny/activity"
      filters={PENNY_FILTERS}
      emptyMessage="No pink slip activity yet. Check back as volume spikes."
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
