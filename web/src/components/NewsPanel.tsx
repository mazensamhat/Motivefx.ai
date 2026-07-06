import { HelpCircle, Newspaper, Sparkles } from "lucide-react";
import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { getUserId } from "../lib/api";
import type { NewsItem } from "../types";
import { AiExplainModal } from "./AiExplainModal";
import { formatTime } from "./ActivityPanel";
import { VirtualizedScoopList } from "./VirtualizedScoopList";

const CATEGORY_LABELS: Record<string, string> = {
  economic: "Economic",
  earnings: "Earnings",
  sports: "Sports",
  geopolitical: "Geopolitical",
  weather: "Weather",
  entertainment: "Entertainment",
  crypto: "Crypto",
  regulatory: "Regulatory",
  global: "Global",
  science: "Science",
  live: "Live",
  market: "Market",
};

interface Props {
  module: "trades" | "penny" | "crypto" | "betting" | "predictions";
}

export function NewsPanel({ module }: Props) {
  const { data, loading } = useApi<{ items: NewsItem[]; personalCount?: number }>(
    `/news/${module}?user_id=${encodeURIComponent(getUserId())}&limit=10`,
    60_000
  );
  const [explain, setExplain] = useState<{
    title: string;
    confidence: number;
    reasons: string[];
    signals?: string[];
    module?: string;
  } | null>(null);

  const items = data?.items ?? [];
  const personalCount = data?.personalCount ?? items.filter((i) => i.affectsYou).length;

  function openWhy(item: NewsItem) {
    const reasons = [
      item.summary,
      item.relevanceReason || "Cross-referenced with your ledger and module signals.",
      `Impact rated ${item.impact} · source ${item.source}.`,
    ].filter(Boolean);
    setExplain({
      title: item.headline.slice(0, 80),
      confidence: Math.min(92, Math.max(55, item.relevanceScore || 70)),
      reasons,
      signals: item.tags ?? [CATEGORY_LABELS[item.category] ?? item.category],
      module,
    });
  }

  return (
    <>
      {explain && (
        <AiExplainModal {...explain} onClose={() => setExplain(null)} />
      )}
      <div className="card news-panel">
        <div className="card-header">
          <h2 className="card-title">
            <Newspaper size={18} /> News & Events — AI Intel Feed
          </h2>
          {personalCount > 0 && (
            <span className="news-personal-badge">
              <Sparkles size={12} /> {personalCount} relevant to your radar
            </span>
          )}
        </div>
        <div className="card-body flush">
          {loading && items.length === 0 ? (
            <div className="loading">Scanning headlines for your radar…</div>
          ) : items.length === 0 ? (
            <div className="empty">No headlines available.</div>
          ) : (
            <VirtualizedScoopList
              items={items}
              estimateRowHeight={120}
              maxHeight="min(26rem, 58vh)"
              measureDynamic
              getItemKey={(item) => item.id}
              renderItem={(item) => (
                <div className={`news-row ${item.affectsYou ? "news-row-personal" : ""}`}>
                  <div className="news-row-top">
                    <span className={`badge badge-${item.impact === "high" ? "bearish" : "neutral"}`}>
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </span>
                    {item.affectsYou && <span className="badge badge-bullish">ON RADAR</span>}
                    <span className="news-source">{item.source}</span>
                    <span className="news-time">{formatTime(item.timestamp)}</span>
                  </div>
                  <div className="news-headline">{item.headline}</div>
                  <div className="news-summary">{item.summary}</div>
                  {item.affectsYou && item.relevanceReason && (
                    <div className="news-relevance">{item.relevanceReason}</div>
                  )}
                  <button type="button" className="btn btn-sm btn-why news-why-btn" onClick={() => openWhy(item)}>
                    <HelpCircle size={12} /> Why?
                  </button>
                </div>
              )}
            />
          )}
        </div>
      </div>
    </>
  );
}
