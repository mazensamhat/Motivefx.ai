/**
 * Creative Critic — will this stop a trader? Distinct from generic AI-trading ads?
 */

import type {
  CaptionPackage,
  CriticReport,
  ScoredHook,
  VideoConcept,
  VisualConcept,
} from "./types";

export function runCreativeCritic(input: {
  hook: ScoredHook;
  caption: CaptionPackage;
  visual: VisualConcept;
  video: VideoConcept;
}): CriticReport {
  const findings: CriticReport["findings"] = [];
  let score = 88;

  if (input.hook.score.scrollStop < 80) {
    findings.push({
      severity: "warn",
      code: "weak_scroll_stop",
      message: "Hook may not interrupt the scroll strongly enough.",
    });
    score -= 8;
  }

  if (!/WAIT|BUY\?|evidence|indicator|confluence|NO TRADE|Not so fast/i.test(input.hook.text + input.visual.headline)) {
    findings.push({
      severity: "warn",
      code: "low_tension",
      message: "First frame / hook lacks clear decision tension.",
    });
    score -= 6;
  }

  if (input.video.beats[0]?.voiceOrSuper === "MotiveFX" || /logo/i.test(input.video.beats[0]?.onScreen ?? "")) {
    findings.push({
      severity: "block",
      code: "logo_open",
      message: "Do not open on logo — open on market tension.",
    });
    score -= 25;
  }

  if (!input.caption.fullCaption.includes("MotiveFX")) {
    findings.push({
      severity: "warn",
      code: "product_buried",
      message: "MotiveFX should appear as reveal, not only as a brand stamp.",
    });
    score -= 5;
  }

  if (/glowing AI|neural|robot brain|candlestick collage/i.test(input.visual.notes + input.visual.headline)) {
    findings.push({
      severity: "warn",
      code: "generic_ai_look",
      message: "Avoid generic AI-trading visual clichés.",
    });
    score -= 10;
  }

  if (input.visual.id === "conflicting_evidence" || input.visual.id === "confluence") {
    findings.push({
      severity: "info",
      code: "shows_decision",
      message: "Visual shows a decision / evidence conflict — on brand.",
    });
    score += 4;
  }

  const firstBeat = input.video.beats[0];
  if (firstBeat && firstBeat.endSec <= 1 && /BUY\?/i.test(firstBeat.voiceOrSuper)) {
    findings.push({
      severity: "info",
      code: "strong_open",
      message: "0–1s open hits decision tension.",
    });
    score += 3;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const blocked = findings.some((f) => f.severity === "block");

  return {
    pass: !blocked && score >= 70,
    score,
    findings,
    summary: blocked
      ? "Creative Critic blocked — fix opening / structure."
      : score >= 85
        ? "Strong trader-facing creative hypothesis."
        : "Usable but refine tension or distinctiveness.",
  };
}
