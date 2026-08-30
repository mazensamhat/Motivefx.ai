/**
 * Financial Claims Critic — can we say this? Can block regardless of Hook Score.
 */

import type {
  CampaignBrief,
  CaptionPackage,
  CriticReport,
  MarketStory,
  ScoredHook,
  VisualConcept,
} from "./types";

const BLOCK_PATTERNS: { re: RegExp; code: string; message: string }[] = [
  {
    re: /\bguaranteed?\b|\brisk[- ]free\b|\bcan'?t lose\b/i,
    code: "guaranteed_outcome",
    message: "Guaranteed / risk-free language is prohibited.",
  },
  {
    re: /\b(make money|guaranteed profit|passive income|get rich)\b/i,
    code: "profit_promise",
    message: "Profit promises are prohibited.",
  },
  {
    re: /\b\d{2,3}%\s*(win|accuracy|success|hit)\s*rate\b/i,
    code: "unsupported_win_rate",
    message: "Unsupported accuracy / win-rate claims are prohibited.",
  },
  {
    re: /\b(financial advice|invest now|you should buy|sure entry)\b/i,
    code: "advice_language",
    message: "Investment-advice language is prohibited.",
  },
  {
    re: /\bai\s+(knows|will predict|predicts)\b/i,
    code: "ai_omniscience",
    message: "Do not claim AI knows or predicts the future.",
  },
];

export function runFinancialClaimsCritic(input: {
  brief: CampaignBrief;
  hook: ScoredHook;
  caption: CaptionPackage;
  visual: VisualConcept;
  story: MarketStory;
}): CriticReport {
  const findings: CriticReport["findings"] = [];
  let score = 100;
  const corpus = [
    input.hook.text,
    input.caption.fullCaption,
    input.visual.headline,
    input.visual.resolution,
    ...input.visual.rows.map((r) => `${r.label} ${r.value}`),
    input.story.motiveSignal,
  ].join("\n");

  for (const rule of BLOCK_PATTERNS) {
    if (rule.re.test(corpus)) {
      findings.push({ severity: "block", code: rule.code, message: rule.message });
      score = 0;
    }
  }

  if (input.brief.mode === "LIVE_MARKET") {
    if (!input.brief.marketTruth) {
      findings.push({
        severity: "block",
        code: "missing_market_truth",
        message: "LIVE_MARKET creatives require approved Market Truth payload.",
      });
      score = 0;
    } else if (!input.brief.marketTruth.sourcesKnown) {
      findings.push({
        severity: "block",
        code: "unknown_sources",
        message: "Live creatives require known timestamp/source provenance.",
      });
      score = 0;
    }
  }

  if (
    (input.visual.truthClass === "DEMO" || input.visual.truthClass === "SIMULATED") &&
    !/demo|simulat/i.test(input.visual.notes + input.visual.headline + input.caption.fullCaption)
  ) {
    findings.push({
      severity: "block",
      code: "unmarked_demo",
      message: "Demo/simulated values must be clearly marked in creative.",
    });
    score = Math.min(score, 0);
  }

  if (input.visual.id === "confidence_board" && input.visual.truthClass === "DEMO") {
    if (!/DEMO|SIMULATED/i.test(JSON.stringify(input.visual.rows) + input.visual.notes)) {
      findings.push({
        severity: "block",
        code: "confidence_unmarked",
        message: "Confidence boards with non-live values must be marked DEMO/SIMULATED.",
      });
      score = 0;
    }
  }

  // Implied returns via P&L aesthetics
  if (/\b(\+|−|-)?\$\d|\bequity curve\b|\b\+\d+%\b/i.test(corpus) && input.brief.mode !== "LIVE_MARKET") {
    findings.push({
      severity: "warn",
      code: "pnl_visual_risk",
      message: "P&L-like figures can imply performance — remove or disclose heavily.",
    });
    score = Math.min(score, 60);
  }

  if (input.brief.mode === "EVERGREEN" || input.brief.mode === "MARKET_AWARE") {
    findings.push({
      severity: "info",
      code: "risk_disclosure",
      message: "Publish package should include standard risk disclosure near CTA.",
    });
  }

  if (input.hook.score.deductions.some((d) => d.points <= -100)) {
    findings.push({
      severity: "block",
      code: "hook_deduction_fatal",
      message: "Hook scored a fatal compliance deduction.",
    });
    score = 0;
  }

  const blocked = findings.some((f) => f.severity === "block");
  return {
    pass: !blocked,
    score: blocked ? 0 : Math.max(0, score),
    findings,
    summary: blocked
      ? "Financial Claims Critic BLOCKED publication."
      : "Claims review clear — disclosure still required at publish.",
  };
}
