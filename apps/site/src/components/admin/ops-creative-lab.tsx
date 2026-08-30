"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, RefreshCw, Sparkles } from "lucide-react";
import type { CreativePipelineResult } from "@/lib/creative/types";

const OBJECTIVES = [
  "awareness",
  "product_education",
  "signup",
  "trial",
  "feature_adoption",
] as const;
const TRADERS = [
  "beginner",
  "intermediate",
  "experienced",
  "technical",
  "overtrader",
  "signal_seeker",
] as const;
const ANGLES = [
  "evidence",
  "confluence",
  "confidence",
  "market_truth",
  "ai_explanation",
  "timing",
  "risk_awareness",
] as const;
const MODES = ["EVERGREEN", "MARKET_AWARE", "LIVE_MARKET"] as const;
const PLATFORMS = [
  "tiktok",
  "reels",
  "instagram",
  "facebook",
  "linkedin",
  "x",
  "youtube_shorts",
] as const;

type LearningPayload = {
  insights: { id: string; statement: string; confidence: string; sampleSize: number; metric: string }[];
  totals: { events: number; impressions: number; signups: number };
};

export function OpsCreativeLab() {
  const [objective, setObjective] = useState<(typeof OBJECTIVES)[number]>("product_education");
  const [trader, setTrader] = useState<(typeof TRADERS)[number]>("experienced");
  const [angle, setAngle] = useState<(typeof ANGLES)[number]>("confluence");
  const [mode, setMode] = useState<(typeof MODES)[number]>("EVERGREEN");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("reels");
  const [symbol, setSymbol] = useState("EUR/USD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreativePipelineResult | null>(null);
  const [learning, setLearning] = useState<LearningPayload | null>(null);
  const [perfBusy, setPerfBusy] = useState(false);

  const loadLearning = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/creative?view=learning", { cache: "no-store" });
      if (res.ok) setLearning((await res.json()) as LearningPayload);
    } catch {
      /* non-blocking */
    }
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        objective,
        trader,
        angle,
        mode,
        platform,
        symbol,
      };
      // LIVE_MARKET: server resolves approved Market Truth from ledger/durable — no invented state
      const res = await fetch("/api/admin/creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Failed (${res.status})`);
      }
      setResult((await res.json()) as CreativePipelineResult);
      void loadLearning();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pipeline failed");
    } finally {
      setLoading(false);
    }
  }, [objective, trader, angle, mode, platform, symbol, loadLearning]);

  useEffect(() => {
    void run();
    void loadLearning();
  }, []); // initial

  async function logSamplePerformance() {
    if (!result) return;
    setPerfBusy(true);
    try {
      const hyp = result.approvalReady[0] ?? result.hypotheses[0];
      await fetch("/api/admin/creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "performance",
          runId: result.runId,
          platform: result.brief.platform,
          traderPersona: result.brief.trader,
          hookFamily: hyp?.hook.family,
          visualStrategy: hyp?.visual.id,
          videoOpening: hyp?.video.beats[0]?.voiceOrSuper,
          captionStructure: "hook_tension_evidence_reveal_cta",
          productFeature: result.brief.angle,
          cta: hyp?.caption.cta,
          impressions: 1000,
          hold3s: 420,
          watchTimeSec: 8.5,
          clicks: 38,
          landings: 22,
          signups: 6,
          activations: 3,
          paid: 1,
          notes: "Ops sample performance event for Creative Learning",
        }),
      });
      await loadLearning();
    } finally {
      setPerfBusy(false);
    }
  }

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Megaphone className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Creative Lab</h2>
            <p>
              Don&apos;t advertise a prediction. Advertise the intelligence behind the decision.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="ops-toolbar-btn"
              onClick={() => void logSamplePerformance()}
              disabled={perfBusy || !result}
            >
              Log sample performance
            </button>
            <button type="button" className="ops-toolbar-btn" onClick={() => void run()} disabled={loading}>
              {loading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {loading ? "Generating…" : "Run pipeline"}
            </button>
          </div>
        </div>
      </header>

      {error ? <p className="admin-error-banner">{error}</p> : null}

      <section className="ops-card">
        <header className="ops-card-header">
          <h3>Campaign brief</h3>
        </header>
        <div className="ops-creative-brief-grid">
          <label>
            Objective
            <select value={objective} onChange={(e) => setObjective(e.target.value as typeof objective)}>
              {OBJECTIVES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trader
            <select value={trader} onChange={(e) => setTrader(e.target.value as typeof trader)}>
              {TRADERS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label>
            Angle
            <select value={angle} onChange={(e) => setAngle(e.target.value as typeof angle)}>
              {ANGLES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label>
            Mode
            <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
              {MODES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label>
            Platform
            <select value={platform} onChange={(e) => setPlatform(e.target.value as typeof platform)}>
              {PLATFORMS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label>
            Symbol
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          </label>
        </div>
        <p className="ops-muted" style={{ marginTop: 8 }}>
          LIVE_MARKET pulls approved Market Truth from the evidence ledger / durable snapshots. AI
          never invents market state. Dual critics remain mandatory before approval.
        </p>
      </section>

      {result ? (
        <>
          <p className="ops-muted">{result.positioning}</p>
          {result.runId ? (
            <p className="ops-muted mono">Run {result.runId}</p>
          ) : null}

          <div className="ops-attention-grid">
            <section className="ops-card">
              <header className="ops-card-header">
                <h3>Platform intelligence</h3>
              </header>
              {result.platform ? (
                <dl className="ops-platform-metrics">
                  <div>
                    <dt>Aspect</dt>
                    <dd>{result.platform.aspectRatio}</dd>
                  </div>
                  <div>
                    <dt>Caption max</dt>
                    <dd>{result.platform.maxCaptionChars}</dd>
                  </div>
                  <div>
                    <dt>Video max</dt>
                    <dd>{result.platform.videoMaxSec}s</dd>
                  </div>
                  <div>
                    <dt>CTA</dt>
                    <dd>{result.platform.ctaPlacement}</dd>
                  </div>
                  <div>
                    <dt>Safe zones</dt>
                    <dd>{result.platform.safeZones}</dd>
                  </div>
                </dl>
              ) : null}
              <ul className="ops-muted" style={{ marginTop: 8, paddingLeft: 16 }}>
                {(result.platform?.notes ?? []).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </section>

            <section className="ops-card">
              <header className="ops-card-header">
                <h3>Market story</h3>
              </header>
              <p className="ops-muted" style={{ marginBottom: 8 }}>
                Truth source: {result.marketTruthSource ?? "n/a"} · class{" "}
                {result.marketStory.truthClass}
              </p>
              <dl className="ops-platform-metrics">
                <div>
                  <dt>Event</dt>
                  <dd>{result.marketStory.marketEvent}</dd>
                </div>
                <div>
                  <dt>Tension</dt>
                  <dd>{result.marketStory.tension}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>{result.marketStory.evidence}</dd>
                </div>
                <div>
                  <dt>Motive Signal</dt>
                  <dd>{result.marketStory.motiveSignal}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="ops-card">
            <header className="ops-card-header">
              <h3>Hook battle</h3>
            </header>
            <p className="ops-muted" style={{ marginBottom: 8 }}>
              Recommended: <strong>{result.battle.recommended.score.total}</strong> ·{" "}
              {result.battle.recommended.text}
            </p>
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Score</th>
                    <th>Family</th>
                    <th>Hook</th>
                    <th>Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {result.hooks.slice(0, 12).map((h) => (
                    <tr key={h.id}>
                      <td className="mono">{h.score.total}</td>
                      <td>{h.family}</td>
                      <td>{h.text}</td>
                      <td>{h.score.compliance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ops-card">
            <header className="ops-card-header">
              <h3>
                Hypotheses · {result.approvalReady.length} approval-ready · {result.blocked.length}{" "}
                blocked
              </h3>
            </header>
            <div className="ops-provider-grid">
              {result.hypotheses.map((h) => (
                <article key={h.id} className="ops-provider-card">
                  <strong>
                    {h.label}{" "}
                    {h.publishBlocked ? (
                      <span className="ops-truth-badge critical">BLOCKED</span>
                    ) : (
                      <span className="ops-truth-badge healthy">READY</span>
                    )}
                  </strong>
                  <p style={{ marginTop: 8 }}>{h.hook.text}</p>
                  <p className="ops-muted" style={{ marginTop: 6 }}>
                    Hook {h.hook.score.total} · Creative {h.creativeCritic.score} · Claims{" "}
                    {h.financialClaimsCritic.score}
                  </p>
                  <p className="ops-muted" style={{ marginTop: 6 }}>
                    Visual: {h.visual.headline} → {h.visual.resolution}
                  </p>
                  <p className="ops-muted" style={{ marginTop: 4, fontSize: 12 }}>
                    {h.visual.notes}
                  </p>
                  {h.blockReasons.length ? (
                    <ul className="ops-muted" style={{ marginTop: 8, paddingLeft: 16 }}>
                      {h.blockReasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : null}
                  <details style={{ marginTop: 10 }}>
                    <summary>Caption</summary>
                    <pre className="ops-creative-caption">{h.caption.fullCaption}</pre>
                  </details>
                  <details style={{ marginTop: 8 }}>
                    <summary>First 3s / storyboard</summary>
                    <ul className="ops-muted" style={{ paddingLeft: 16 }}>
                      {h.video.beats.map((b) => (
                        <li key={`${b.startSec}-${b.endSec}`}>
                          {b.startSec}–{b.endSec}s · {b.voiceOrSuper}{" "}
                          <span>({b.onScreen})</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section className="ops-card">
        <header className="ops-card-header">
          <h3>Creative Learning</h3>
        </header>
        {learning ? (
          <>
            <p className="ops-muted" style={{ marginBottom: 8 }}>
              {learning.totals.events} events · {learning.totals.impressions.toLocaleString()}{" "}
              impressions · {learning.totals.signups} signups
            </p>
            <ul className="ops-attention-list">
              {learning.insights.map((i) => (
                <li key={i.id} className="ops-attention-item info">
                  <span className="ops-attention-mark">→</span>
                  <div>
                    <span>{i.statement}</span>
                    <p className="ops-muted">
                      {i.confidence} confidence · n={i.sampleSize} · {i.metric}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="ops-muted">Loading learning…</p>
        )}
      </section>
    </section>
  );
}
