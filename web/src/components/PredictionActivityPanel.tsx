import { ActivityPanel, formatTime, formatUsd } from "./ActivityPanel";
import { DATE_FROM_FILTER, DATE_TO_FILTER } from "./activityFilters";

const PREDICTION_FILTERS = [
  {
    key: "category",
    label: "Category",
    type: "select" as const,
    param: "category",
    options: [
      { value: "geopolitics", label: "Geopolitics & War" },
      { value: "politics", label: "Politics & Elections" },
      { value: "entertainment", label: "Celebrity & Culture" },
      { value: "economy", label: "Economy & Fed" },
      { value: "science", label: "Science & Tech" },
      { value: "crypto", label: "Crypto Events" },
    ],
  },
  { key: "market", label: "Market", type: "text" as const, placeholder: "Ukraine, wedding…", param: "market" },
  {
    key: "side",
    label: "Side",
    type: "select" as const,
    param: "side",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  DATE_FROM_FILTER,
  DATE_TO_FILTER,
  { key: "min_stake", label: "Min stake", type: "number" as const, placeholder: "100", param: "min_stake" },
];

export function PredictionActivityPanel() {
  return (
    <ActivityPanel
      module="predictions"
      title="Prediction Market Activity — Who's Betting on What"
      endpoint="/predictions/activity"
      filters={PREDICTION_FILTERS}
      emptyMessage="No prediction market activity for these filters."
      columns={[
        { key: "timestamp", label: "Time", render: (r) => formatTime(r.timestamp) },
        { key: "categoryLabel", label: "Category", render: (r) => <span className="badge badge-neutral">{String(r.categoryLabel ?? r.category)}</span> },
        { key: "market", label: "Market", render: (r) => <strong className="cell-note">{String(r.market)}</strong> },
        { key: "bettor", label: "Who", render: (r) => <span className="cell-mono">{String(r.bettor)}</span> },
        {
          key: "pick",
          label: "Pick",
          render: (r) => (
            <span className={`badge badge-${r.side === "yes" ? "bullish" : "bearish"}`}>
              {String(r.pick).toUpperCase()}
            </span>
          ),
        },
        { key: "yesPrice", label: "YES %", render: (r) => `${(Number(r.yesPrice) * 100).toFixed(0)}%` },
        { key: "stake", label: "Stake", render: (r) => formatUsd(r.stake) },
        { key: "marketBetCount", label: "Market bets", render: (r) => Number(r.marketBetCount).toLocaleString() },
      ]}
    />
  );
}
