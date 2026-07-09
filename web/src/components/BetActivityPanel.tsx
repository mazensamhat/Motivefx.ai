import { ActivityPanel, formatTime, formatUsd } from "./ActivityPanel";
import { DATE_FROM_FILTER, DATE_TO_FILTER } from "./activityFilters";

const SPORT_FILTER = {
  key: "sport",
  label: "Sport",
  type: "select" as const,
  param: "sport",
  options: [
    { value: "football", label: "Football (NFL)" },
    { value: "basketball", label: "Basketball (NBA)" },
    { value: "baseball", label: "Baseball (MLB)" },
    { value: "hockey", label: "Hockey (NHL)" },
    { value: "soccer", label: "Soccer" },
    { value: "mma", label: "MMA / UFC" },
    { value: "tennis", label: "Tennis" },
  ],
};

const BET_FILTERS = [
  SPORT_FILTER,
  { key: "matchup", label: "Matchup", type: "text" as const, placeholder: "Chiefs", param: "matchup" },
  {
    key: "status",
    label: "Status",
    type: "select" as const,
    param: "status",
    options: [
      { value: "open", label: "Open" },
      { value: "won", label: "Won" },
      { value: "lost", label: "Lost" },
    ],
  },
  DATE_FROM_FILTER,
  DATE_TO_FILTER,
  { key: "min_stake", label: "Min stake", type: "number" as const, placeholder: "50", param: "min_stake" },
];

export function BetActivityPanel() {
  return (
    <ActivityPanel
      module="betting"
      title="Your Bets"
      subtitle="Full slip history — tap a row for context."
      endpoint="/betting/activity"
      filters={BET_FILTERS}
      emptyMessage="No bets logged yet. Add bets above or check back soon."
      columns={[
        { key: "created_at", label: "Logged", render: (r) => formatTime(r.created_at) },
        {
          key: "sport",
          label: "Sport",
          render: (r) => <span className="badge badge-neutral">{String(r.sport ?? "—").toUpperCase()}</span>,
        },
        {
          key: "matchup",
          label: "Matchup",
          mobilePrimary: true,
          render: (r) => <strong>{String(r.matchup)}</strong>,
        },
        { key: "pick", label: "Pick", mobilePrimary: true },
        { key: "odds", label: "Odds", render: (r) => <span className="cell-mono">{String(r.odds)}</span> },
        {
          key: "stake",
          label: "Stake",
          mobilePrimary: true,
          render: (r) => formatUsd(r.stake),
        },
        {
          key: "status",
          label: "Status",
          mobilePrimary: true,
          render: (r) => (
            <span className={`badge badge-${r.status === "open" ? "neutral" : r.status === "won" ? "bullish" : "bearish"}`}>
              {String(r.status ?? "open").toUpperCase()}
            </span>
          ),
        },
      ]}
      buildWhy={(r) => ({
        title: `Bet context: ${String(r.matchup)}`,
        confidence: r.status === "open" ? 68 : 80,
        reasons: [
          `Pick: ${String(r.pick)} at ${String(r.odds)} for ${formatUsd(r.stake)} stake.`,
          `Status: ${String(r.status ?? "open")}. Sport: ${String(r.sport ?? "other")}.`,
          "Graded against sharp/public splits when analyzed — informational only.",
        ],
        signals: ["Bet Slip", String(r.sport ?? "sport").toUpperCase()],
      })}
    />
  );
}
