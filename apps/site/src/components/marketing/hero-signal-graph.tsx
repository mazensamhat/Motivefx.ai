"use client";

import { useEffect, useState } from "react";
import { HERO_FLOAT_SIGNALS, HERO_SIGNAL_PATH } from "@/lib/marketing-copy";

/**
 * Full-bleed predictive visual: floating world signals → connections → one glowing path.
 */
export function HeroSignalGraph() {
  const [phase, setPhase] = useState<"float" | "link" | "path">("float");

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("link"), 1600);
    const t2 = window.setTimeout(() => setPhase("path"), 3200);
    const loop = window.setInterval(() => {
      setPhase("float");
      window.setTimeout(() => setPhase("link"), 1600);
      window.setTimeout(() => setPhase("path"), 3200);
    }, 9000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearInterval(loop);
    };
  }, []);

  return (
    <div className={`hero-signal-graph phase-${phase}`} aria-hidden>
      <div className="hero-signal-field">
        {HERO_FLOAT_SIGNALS.map((label, i) => (
          <span
            key={label}
            className="hero-signal-dot"
            style={{ ["--i" as string]: String(i) }}
          >
            <i />
            {label}
          </span>
        ))}
      </div>

      <svg className="hero-signal-lines" viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="signalGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,230,118,0)" />
            <stop offset="50%" stopColor="rgba(0,230,118,0.85)" />
            <stop offset="100%" stopColor="rgba(0,230,118,0)" />
          </linearGradient>
        </defs>
        <path
          className="hero-signal-line a"
          d="M80 90 C 180 40, 260 200, 360 140 S 520 80, 580 160"
          fill="none"
          stroke="url(#signalGlow)"
          strokeWidth="1.5"
        />
        <path
          className="hero-signal-line b"
          d="M60 220 C 160 260, 240 100, 340 180 S 480 300, 600 240"
          fill="none"
          stroke="url(#signalGlow)"
          strokeWidth="1.25"
        />
        <path
          className="hero-signal-line c"
          d="M40 160 C 140 120, 220 280, 400 220 S 540 120, 620 200"
          fill="none"
          stroke="url(#signalGlow)"
          strokeWidth="1"
        />
      </svg>

      <div className="hero-signal-path">
        <p className="hero-signal-path-label">Emerging path</p>
        <ol>
          {HERO_SIGNAL_PATH.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
