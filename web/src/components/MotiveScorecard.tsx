import type { MotiveScorecard, LeanBand } from "../utils/motiveScorecard";

interface Props {
  scorecard: MotiveScorecard;
  accent: string;
}

function bandClass(band: LeanBand): string {
  if (band === "supportive") return "is-supportive";
  if (band === "cautious") return "is-cautious";
  return "is-mixed";
}

export function MotiveScorecardPanel({ scorecard: sc, accent }: Props) {
  const needlePct = ((sc.gauge.needle + 100) / 200) * 100;

  return (
    <section className="motive-scorecard" aria-label={sc.title}>
      <header className="motive-scorecard-header">
        <div>
          <h3 className="motive-scorecard-title">{sc.title}</h3>
          <p className="motive-scorecard-sub">{sc.subtitle}</p>
        </div>
      </header>

      <p className="motive-scorecard-exec">{sc.executiveSummary}</p>

      {/* Health bar — TradingView-style spectrum */}
      <div className="msc-block">
        <div className="msc-block-head">
          <span>{sc.health.label}</span>
          <strong className={bandClass(sc.health.band)}>{sc.health.score}/100 · {sc.health.band}</strong>
        </div>
        <div className="msc-health-track" role="img" aria-label={`Health ${sc.health.score}`}>
          <div className="msc-health-spectrum" />
          <div className="msc-health-marker" style={{ left: `${sc.health.score}%`, borderColor: accent }} />
        </div>
        <p className="msc-hint">{sc.health.hint}</p>
      </div>

      {/* Flow lean gauge */}
      <div className="msc-block msc-gauge-block">
        <div className="msc-block-head">
          <span>{sc.gauge.label}</span>
          <strong className={bandClass(bandFromNeedle(sc.gauge.needle))}>{sc.gauge.bandLabel}</strong>
        </div>
        <div className="msc-gauge">
          <div className="msc-gauge-arc" />
          <div
            className="msc-gauge-needle"
            style={{ transform: `rotate(${-90 + (needlePct / 100) * 180}deg)`, background: accent }}
          />
          <div className="msc-gauge-labels">
            <span>Cautious</span>
            <span>Mixed</span>
            <span>Supportive</span>
          </div>
        </div>
        <p className="msc-hint">{sc.gauge.hint}</p>
      </div>

      {/* Desk consensus */}
      <div className="msc-block">
        <div className="msc-block-head">
          <span>{sc.sentiment.label}</span>
          <strong className={bandClass(sc.sentiment.lean)}>{sc.sentiment.leanLabel}</strong>
        </div>
        <div className="msc-sentiment-stats">
          {sc.sentiment.primaryStat != null && (
            <div>
              <span className="msc-stat-label">{sc.sentiment.primaryStatLabel}</span>
              <span className="msc-stat-value">{sc.sentiment.primaryStat}</span>
            </div>
          )}
          {sc.sentiment.secondaryStat != null && (
            <div>
              <span className="msc-stat-label">{sc.sentiment.secondaryStatLabel}</span>
              <span
                className={`msc-stat-value ${
                  String(sc.sentiment.secondaryStat).startsWith("+")
                    ? "is-supportive"
                    : String(sc.sentiment.secondaryStat).startsWith("-")
                      ? "is-cautious"
                      : ""
                }`}
              >
                {sc.sentiment.secondaryStat}
              </span>
            </div>
          )}
        </div>
        <p className="msc-hint">{sc.sentiment.hint}</p>
      </div>

      {/* Crowd lean */}
      <div className="msc-block">
        <div className="msc-block-head">
          <span>{sc.crowd.label}</span>
        </div>
        <div className="msc-crowd">
          <div className="msc-crowd-btn is-cautious">
            <span>Cautious</span>
            <strong>{sc.crowd.bearishPct}%</strong>
          </div>
          <div className="msc-crowd-btn is-supportive">
            <span>Supportive</span>
            <strong>{sc.crowd.bullishPct}%</strong>
          </div>
        </div>
        <div className="msc-crowd-bar">
          <i style={{ width: `${sc.crowd.bearishPct}%` }} className="is-cautious" />
          <i style={{ width: `${sc.crowd.bullishPct}%` }} className="is-supportive" />
        </div>
        <p className="msc-hint">{sc.crowd.hint}</p>
      </div>

      {/* Ratings */}
      <div className="msc-block">
        <div className="msc-block-head">
          <span>Lens ratings</span>
        </div>
        <ul className="msc-ratings">
          {sc.ratings.map((r) => (
            <li key={r.label}>
              <span>{r.label}</span>
              <div className="msc-rating-track">
                <div
                  className="msc-rating-fill"
                  style={{ width: `${(r.score / r.max) * 100}%`, background: accent }}
                />
              </div>
              <strong>
                {r.score}/{r.max}
              </strong>
            </li>
          ))}
        </ul>
      </div>

      {/* Key indicators — Pro Research style */}
      <div className="msc-block">
        <div className="msc-block-head">
          <span>Key indicators</span>
        </div>
        <div className="msc-indicators">
          {sc.indicators.map((ind) => (
            <div key={ind.label} className="msc-ind">
              <span className="msc-ind-label">{ind.label}</span>
              <span className="msc-ind-value">{ind.value}</span>
              {ind.hint ? <span className="msc-ind-hint">{ind.hint}</span> : null}
            </div>
          ))}
        </div>
      </div>

      {/* Earnings trend (equities) */}
      {sc.earningsTrend && sc.earningsTrend.length > 0 && (
        <div className="msc-block">
          <div className="msc-block-head">
            <span>Earnings trend (context)</span>
          </div>
          <div className="msc-eps-row">
            {sc.earningsTrend.map((pt) => {
              const max = Math.max(...sc.earningsTrend!.map((p) => Math.max(p.estimate, p.actual ?? 0)), 0.01);
              return (
                <div key={pt.label} className="msc-eps-col">
                  <div className="msc-eps-bars">
                    <div
                      className="msc-eps-est"
                      style={{ height: `${(pt.estimate / max) * 72}px` }}
                      title={`Est ${pt.estimate}`}
                    />
                    {pt.actual != null && (
                      <div
                        className="msc-eps-act"
                        style={{ height: `${(pt.actual / max) * 72}px`, background: accent }}
                        title={`Act ${pt.actual}`}
                      />
                    )}
                  </div>
                  <span className="msc-eps-label">{pt.label}</span>
                  {pt.beatLabel && (
                    <span
                      className={`msc-eps-beat ${
                        pt.beatLabel.startsWith("Beat")
                          ? "is-supportive"
                          : pt.beatLabel.startsWith("Miss")
                            ? "is-cautious"
                            : ""
                      }`}
                    >
                      {pt.beatLabel}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="msc-hint">Estimate vs actual style view — illustrative when live EPS feed is offline.</p>
        </div>
      )}

      {/* Estimates table */}
      {sc.estimates && sc.estimates.length > 0 && (
        <div className="msc-block msc-estimates">
          <div className="msc-block-head">
            <span>Earnings estimates</span>
          </div>
          <div className="msc-table-wrap">
            <table className="msc-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {sc.estimates.map((c) => (
                    <th key={c.period}>{c.period}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>No. of analysts</td>
                  {sc.estimates.map((c) => (
                    <td key={`${c.period}-a`}>{c.analysts ?? "—"}</td>
                  ))}
                </tr>
                <tr>
                  <td>Avg. estimate</td>
                  {sc.estimates.map((c) => (
                    <td key={`${c.period}-avg`}>{c.avg ?? "—"}</td>
                  ))}
                </tr>
                <tr>
                  <td>Low / High</td>
                  {sc.estimates.map((c) => (
                    <td key={`${c.period}-lh`}>
                      {c.low ?? "—"} / {c.high ?? "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td>Year ago EPS</td>
                  {sc.estimates.map((c) => (
                    <td key={`${c.period}-ya`}>{c.yearAgo ?? "—"}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="msc-block">
        <div className="msc-block-head">
          <span>Motive tips</span>
        </div>
        <ul className="msc-tips">
          {sc.tips.map((t, i) => (
            <li key={i} className={`msc-tip is-${t.tone}`}>
              {t.text}
            </li>
          ))}
        </ul>
      </div>

      <p className="msc-data-note">{sc.dataNote}</p>
    </section>
  );
}

function bandFromNeedle(needle: number): LeanBand {
  if (needle >= 20) return "supportive";
  if (needle <= -20) return "cautious";
  return "mixed";
}
