import { ActivityPanel, formatPrice, formatTime, formatUsd } from "./ActivityPanel";
import {
  CRYPTO_PRICE_FILTERS,
  DATE_FROM_FILTER,
  DATE_TO_FILTER,
  SIDE_FILTER,
} from "./activityFilters";

function sideBadgeClass(side: unknown): string {
  const s = String(side ?? "").toLowerCase();
  return s === "sell" ? "bearish" : "bullish";
}

const CRYPTO_FILTERS = [
  { key: "symbol", label: "Symbol", type: "text" as const, placeholder: "BTC", param: "symbol" },
  SIDE_FILTER,
  DATE_FROM_FILTER,
  DATE_TO_FILTER,
  { key: "min_amount", label: "Min USD", type: "number" as const, placeholder: "1000000", param: "min_amount" },
  ...CRYPTO_PRICE_FILTERS,
];

export function CryptoActivityPanel() {
  return (
    <ActivityPanel
      module="crypto"
      title="Crypto Spot Activity — Buys & Sells"
      endpoint="/crypto/activity"
      filters={CRYPTO_FILTERS}
      emptyMessage="No crypto spot activity for these filters."
      columns={[
        { key: "timestamp", label: "Time", render: (r) => formatTime(r.timestamp) },
        {
          key: "symbol",
          label: "Symbol",
          mobilePrimary: true,
          render: (r) => <strong>{String(r.symbol)}</strong>,
        },
        { key: "price", label: "Token price", render: (r) => formatPrice(r.price) },
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
        {
          key: "amountCrypto",
          label: "Amount",
          render: (r) => Number(r.amountCrypto).toLocaleString(undefined, { maximumFractionDigits: 2 }),
        },
        {
          key: "amountUsd",
          label: "USD",
          mobilePrimary: true,
          render: (r) => formatUsd(r.amountUsd),
        },
        { key: "venue", label: "Venue", mobilePrimary: true },
        { key: "from", label: "From", render: (r) => <span className="cell-mono">{String(r.from ?? "").slice(0, 18)}</span> },
        { key: "to", label: "To", render: (r) => <span className="cell-mono">{String(r.to ?? "").slice(0, 18)}</span> },
        { key: "note", label: "Note", render: (r) => <span className="cell-note">{String(r.note ?? "")}</span> },
      ]}
      buildWhy={(r) => ({
        title: `${String(r.side).toUpperCase()} ${String(r.symbol)} flow`,
        symbol: String(r.symbol),
        confidence: 76,
        reasons: [
          String(r.note || "On-chain / exchange flow flagged by Crypto desk."),
          `${formatUsd(r.amountUsd)} moved at ${formatPrice(r.price)}.`,
          `Venue ${String(r.venue ?? "unknown")}. Informational whale context only.`,
        ],
        signals: ["Whale Flow", String(r.side).toUpperCase()],
      })}
    />
  );
}
