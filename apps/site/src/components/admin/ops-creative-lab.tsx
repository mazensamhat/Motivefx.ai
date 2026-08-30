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
      if (mode === "LIVE_MARKET") {
        body.marketTruth = {
          symbol,
          stance: "Wait",
          motiveSignal: 48,
          confidence: 62,
          truthClass: "DEMO",
          sourcesKnown: true,
          asOf: new Date().toISOString(),
          evidence: [
            { label: "Momentum", stance: "Bullish" },
            { label: "Structure", stance: "Bullish" },
            { label: "Volatility", stance: "Elevated" },
            { label: "Confirmation", stance: "Missing" },
          ],
        };
      }
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pipeline failed");
    } finally {
      setLoading(false);
    }
  }, [objective, trader, angle, mode, platform, symbol]);

  useEffect(() => {
    void run();
  }, []); // initial evergreen run

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
          <button type="button" className="ops-toolbar-btn" onClick={() => void run()} disabled={loading}>
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {loading ? "Generating…" : "Run pipeline"}
          </button>
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
          LIVE_MARKET in this Lab uses a clearly marked DEMO Market Truth sample until live ledger
          wiring is complete. Financial Claims Critic still blocks unmarked claims.
        </p>
      </section>

      {result ? (
        <>
          <p className="ops-muted">{result.positioning}</p>

          <div className="ops-attention-grid">
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
                <h3>Market story</h3>
              </header>
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
                  <dt>Truth class</dt>
                  <dd>{result.marketStory.truthClass}</dd>
                </div>
              </dl>
            </section>
          </div>

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
    </section>
  );
}
