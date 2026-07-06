import { Brain, Check, HelpCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { useGenerationalProfile } from "../hooks/useGenerationalProfile";
import type { Recommendation } from "../types";
import type { MotiveRatingContext } from "../utils/motiveRating";
import {
  MOTIVE_RATING_DISCLAIMER,
  formatMotiveSignalScore,
  formatSignalReasons,
  resolveMotiveRating,
  sentimentBadgeClass,
} from "../utils/motiveRating";
import { AiExplainModal } from "./AiExplainModal";
import { AiRadialGauge } from "./AiRadialGauge";
import { RiskBadge } from "./RiskBadge";
import { SignalChip } from "./SignalChip";
import { TerminalRow } from "./TerminalRow";

function riskFromConfidence(confidence: number): string {
  if (confidence >= 80) return "low";
  if (confidence >= 65) return "medium";
  if (confidence >= 50) return "high";
  return "extreme";
}

interface Props {
  summary?: string;
  aiNarrative?: string;
  recommendations: Recommendation[];
  picks?: Recommendation[];
  loading?: boolean;
  holdingsCount?: number;
  analyzeError?: string | null;
  onAnalyze?: () => void;
  /** markets | betting | predictions — adjusts sentiment labels */
  ratingContext?: MotiveRatingContext;
}

export function AiAdvisor({
  summary,
  aiNarrative,
  recommendations,
  picks,
  loading,
  holdingsCount = 0,
  analyzeError,
  onAnalyze,
  ratingContext = "markets",
}: Props) {
  const { profile } = useGenerationalProfile();
  const top = picks?.[0] ?? recommendations[0];
  const [explain, setExplain] = useState<{
    title: string;
    symbol?: string;
    confidence: number;
    reasons: string[];
    signals?: string[];
    action?: string;
  } | null>(null);

  if (loading) {
    return (
      <div className="card glass-card advisor-card">
        <div className="advisor-loading-overlay">
          <Sparkles size={22} className="spin" />
          <span>{profile.intelLoadingMessage.toUpperCase()}</span>
        </div>
      </div>
    );
  }

  if (!recommendations.length && !picks?.length && !aiNarrative) {
    return (
      <div className="card glass-card advisor-card">
        <div className="card-header card-header-bold">
          <h2 className="card-title card-title-lg">
            <Brain size={18} /> {profile.intelInsightsTitle}
          </h2>
        </div>
        <div className="advisor-empty-state">
          {holdingsCount > 0 ? (
            <>
              <p className="advisor-empty-title">{holdingsCount} position{holdingsCount === 1 ? "" : "s"} loaded</p>
              <p className="advisor-empty-copy">
                Hit <strong>AI Analyze</strong> on the ledger to cross-check holdings against live flow and signals.
              </p>
              {onAnalyze && (
                <button type="button" className="btn btn-accent-terminal btn-sm" onClick={onAnalyze} disabled={loading}>
                  Run AI Analyze
                </button>
              )}
            </>
          ) : (
            <p>Save your holdings or bets, then analyze for informational signal context.</p>
          )}
          {analyzeError && <p className="advisor-empty-error">{analyzeError}</p>}
        </div>
      </div>
    );
  }

  const topRating = top ? resolveMotiveRating(top.action, top.confidence, ratingContext) : null;
  const topReasons = top ? formatSignalReasons(top.signals, top.reasoning) : [];

  return (
    <>
      {explain && (
        <AiExplainModal
          {...explain}
          action={explain.action}
          ratingContext={ratingContext}
          onClose={() => setExplain(null)}
        />
      )}
      <div className="card glass-card advisor-card">
        <div className="card-header card-header-bold">
          <h2 className="card-title card-title-lg">
            <Brain size={18} /> {profile.intelInsightsTitle}
          </h2>
          <span className="terminal-status-tag live">LIVE INTEL</span>
        </div>

        {top && topRating && (
          <div className="advisor-diagnostic-strip">
            <AiRadialGauge
              value={top.confidence}
              action={top.action}
              variant="advisor"
              context={ratingContext}
            />
            <div className="advisor-diagnostic-copy">
              <span className="advisor-diagnostic-label">Motive Signal</span>
              <p className="advisor-diagnostic-score">{formatMotiveSignalScore(topRating.score)}</p>
              <p className={`advisor-diagnostic-sentiment ${sentimentBadgeClass(topRating.tier)}`}>
                {topRating.label}
              </p>
              <p className="advisor-diagnostic-headline">{top.headline}</p>
              {topReasons.length > 0 && (
                <ul className="motive-reason-list">
                  {topReasons.slice(0, 5).map((reason) => (
                    <li key={reason}>
                      <Check size={12} aria-hidden />
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
              {top.signals.length > 0 && (
                <div className="advisor-signal-row">
                  {top.signals.map((s) => (
                    <SignalChip
                      key={s}
                      label={s}
                      detail={{ symbol: top.symbol, confidence: top.confidence }}
                    />
                  ))}
                </div>
              )}
              <div className="advisor-row-actions">
                <RiskBadge
                  level={top.riskLevel ?? riskFromConfidence(top.confidence)}
                  className="advisor-risk-pill"
                  context={top.headline}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-why"
                  onClick={() =>
                    setExplain({
                      title: top.headline,
                      symbol: top.symbol,
                      confidence: top.confidence,
                      action: top.action,
                      reasons: topReasons.length ? topReasons : [top.reasoning],
                      signals: top.signals,
                    })
                  }
                >
                  <HelpCircle size={12} /> Why?
                </button>
              </div>
            </div>
          </div>
        )}

        {(aiNarrative || summary) && (
          <div className="advisor-narrative-block">
            {aiNarrative
              ? aiNarrative.split("\n").slice(0, 2).map((line, i) => <p key={i}>{line}</p>)
              : <p>{summary}</p>}
          </div>
        )}

        <p className="advisor-intel-footnote">{MOTIVE_RATING_DISCLAIMER}</p>

        <div className="card-body flush terminal-feed">
          {picks && picks.length > 0 && (
            <>
              <div className="section-label">Market intelligence highlights</div>
              {picks.map((p, i) => (
                <AdvisorRow key={`pick-${i}`} rec={p} ratingContext={ratingContext} onExplain={setExplain} />
              ))}
            </>
          )}
          {recommendations.map((r, i) => (
            <AdvisorRow key={i} rec={r} ratingContext={ratingContext} onExplain={setExplain} />
          ))}
        </div>
      </div>
    </>
  );
}

function AdvisorRow({
  rec,
  ratingContext,
  onExplain,
}: {
  rec: Recommendation;
  ratingContext: MotiveRatingContext;
  onExplain: (v: {
    title: string;
    symbol?: string;
    confidence: number;
    reasons: string[];
    signals?: string[];
    action?: string;
  }) => void;
}) {
  const rating = resolveMotiveRating(rec.action, rec.confidence, ratingContext);
  const reasons = formatSignalReasons(rec.signals, rec.reasoning, 3);
  const risk = rec.riskLevel ?? riskFromConfidence(rec.confidence);

  return (
    <TerminalRow
      tag={{ label: rating.shortLabel, variant: rating.variant }}
      primary={
        <>
          Motive Signal {formatMotiveSignalScore(rating.score)} · {rec.headline}
        </>
      }
      secondary={
        <div>
          {reasons.length > 0 ? (
            <ul className="motive-reason-list motive-reason-list-compact">
              {reasons.map((reason) => (
                <li key={reason}>
                  <Check size={11} aria-hidden />
                  {reason}
                </li>
              ))}
            </ul>
          ) : (
            rec.reasoning.slice(0, 120) + (rec.reasoning.length > 120 ? "…" : "")
          )}
          <div className="advisor-row-actions">
            <RiskBadge level={risk} className="advisor-risk-pill" context={rec.headline} />
            <button
              type="button"
              className="btn btn-sm btn-why"
              onClick={() =>
                onExplain({
                  title: rec.headline,
                  symbol: rec.symbol,
                  confidence: rec.confidence,
                  action: rec.action,
                  reasons: reasons.length ? reasons : [rec.reasoning],
                  signals: rec.signals,
                })
              }
            >
              Why?
            </button>
          </div>
        </div>
      }
    />
  );
}
