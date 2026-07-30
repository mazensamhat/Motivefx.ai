import { SIGNAL_FEED_DEMO } from "@/lib/marketing-copy";

export function SignalEngineSection() {
  return (
    <section className="section-pad blueprint-section blueprint-section-alt">
      <div className="mx-auto max-w-6xl px-4 grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="section-kicker">Signal Engine™</p>
          <h2 className="section-title">
            The AI Doesn&apos;t Read Headlines.
            <br />
            It Connects Signals.
          </h2>
          <p className="section-sub text-left">
            Instead of dozens of articles, you get the signals that matter — with likely effects and
            confidence attached.
          </p>
        </div>

        <article className="signal-feed-card">
          <span className="signal-feed-badge">Signal Detected</span>
          <h3>{SIGNAL_FEED_DEMO.title}</h3>
          <p className="signal-feed-label">Likely Effects</p>
          <ul>
            {SIGNAL_FEED_DEMO.effects.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <div className="signal-feed-confidence">
            Confidence <strong>{SIGNAL_FEED_DEMO.confidence}%</strong>
          </div>
        </article>
      </div>
    </section>
  );
}
