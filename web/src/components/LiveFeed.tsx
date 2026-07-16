import { useApi } from "../hooks/useApi";
import { useSignalDetail } from "../hooks/useSignalDetail";
import type { LiveEvent } from "../types";
import { liveEventToSignalDetail } from "../utils/signalIntel";

export function LiveFeed() {
  // 5 min — odds board is server-cached ~10 min; 15s polling burned Odds API quota.
  const { data } = useApi<{ events: LiveEvent[] }>("/live-feed", 300_000);
  const { inspectDetail } = useSignalDetail();
  const events = data?.events ?? [];

  if (events.length === 0) {
    return (
      <div className="live-feed">
        <div className="feed-item" style={{ padding: "0 1.5rem" }}>
          Scanning markets for smart money signals…
        </div>
      </div>
    );
  }

  const doubled = [...events, ...events];

  return (
    <div className="live-feed">
      <div className="live-feed-inner">
        {doubled.map((e, i) => (
          <button
            key={i}
            type="button"
            className="feed-item feed-item-clickable"
            onClick={() => inspectDetail(liveEventToSignalDetail(e.type, e.message))}
            title="Click for signal details"
          >
            <span className={`tag tag-${e.type}`}>{e.type}</span>
            {e.message}
          </button>
        ))}
      </div>
    </div>
  );
}
