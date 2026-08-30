/**
 * MotiveFX Hook Scorer — attention + compliance with severe claim deductions.
 */

import type { CampaignBrief, HookCandidate, HookScoreBreakdown, ScoredHook } from "./types";

const DEDUCTION_PATTERNS: { re: RegExp; reason: string; points: number }[] = [
  { re: /\bguaranteed?\b|\bguarantee\b/i, reason: "Guaranteed outcome", points: -100 },
  {
    re: /\b(profit|profits|make money|get rich|passive income|risk[- ]free)\b/i,
    reason: "Profit promise",
    points: -100,
  },
  {
    re: /\b\d{2,3}%\s*(win|accuracy|success|hit)\s*rate\b|\b\d{2,3}%\s*accurate\b/i,
    reason: "Unsupported win rate",
    points: -100,
  },
  {
    re: /\bbacktest(ed|ing)?\b.*\b(proof|proven|guaranteed)\b|\bproven\s+strategy\b/i,
    reason: "Unsupported backtest",
    points: -100,
  },
  {
    re: /\b(p&l|pnl|equity curve)\b.*\b(guaranteed|sure|always)\b/i,
    reason: "Misleading P&L visual language",
    points: -100,
  },
  {
    re: /\bai\s+(knows|predicts|will tell you)\b|\bpredict(s|ing)?\s+the\s+(next\s+)?(candle|move|market)\b/i,
    reason: '"AI knows the future"',
    points: -50,
  },
  {
    re: /\b(limited time|act now|last chance|don't miss)\b/i,
    reason: "Fake urgency",
    points: -40,
  },
  {
    re: /\bto the moon\b|\bbull run incoming\b|\beasy money\b|\bsure thing\b/i,
    reason: "Generic trading cliché",
    points: -20,
  },
];

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function baseDims(hook: HookCandidate, brief: CampaignBrief): Omit<HookScoreBreakdown, "deductions" | "total"> {
  const t = hook.text;
  const len = t.length;
  const hasSymbol = Boolean(brief.symbol) && t.includes((brief.symbol ?? "").toUpperCase());
  const evidenceWords = /evidence|confluence|confirmation|context|wait|signal|indicator/i.test(t);
  const tension = /\?|but |isn't |don't |stop |missing|not so|≠/i.test(t);
  const specific = hasSymbol || /\d+|EUR|USD|BUY|WAIT|NO TRADE/i.test(t);
  const aiMisconception = hook.family === "ai_misconception";
  const demonstration = hook.family === "demonstration";
  const pain = hook.family === "trader_pain";

  return {
    scrollStop: clamp(78 + (tension ? 12 : 0) + (len < 90 ? 4 : 0) + (demonstration ? 6 : 0)),
    traderRecognition: clamp(80 + (pain ? 12 : 0) + (hook.family === "signal_overload" ? 8 : 0)),
    marketTension: clamp(75 + (tension ? 14 : 0) + (hook.family === "decision_tension" ? 10 : 0)),
    curiosity: clamp(72 + (/\?/.test(t) ? 12 : 0) + (hook.family === "missed_context" ? 8 : 0)),
    specificity: clamp(70 + (specific ? 18 : 0) + (demonstration ? 8 : 0)),
    clarity: clamp(82 + (len < 100 ? 8 : -4) + (len > 140 ? -10 : 0)),
    productConnection: clamp(76 + (evidenceWords ? 10 : 0) + (brief.angle === "confluence" && hook.family === "confluence" ? 8 : 0)),
    evidenceOrientation: clamp(80 + (evidenceWords ? 12 : 0) + (hook.family === "evidence_challenge" ? 8 : 0)),
    credibility: clamp(84 + (aiMisconception ? 8 : 0) + (hook.family === "pattern_interrupt" ? 4 : 0)),
    compliance: 100,
  };
}

export function scoreHook(hook: HookCandidate, brief: CampaignBrief): ScoredHook {
  const dims = baseDims(hook, brief);
  const deductions: HookScoreBreakdown["deductions"] = [];
  for (const rule of DEDUCTION_PATTERNS) {
    if (rule.re.test(hook.text)) {
      deductions.push({ reason: rule.reason, points: rule.points });
      if (rule.points <= -100) dims.compliance = 0;
      else dims.compliance = clamp(dims.compliance + rule.points / 2);
    }
  }

  const values = [
    dims.scrollStop,
    dims.traderRecognition,
    dims.marketTension,
    dims.curiosity,
    dims.specificity,
    dims.clarity,
    dims.productConnection,
    dims.evidenceOrientation,
    dims.credibility,
    dims.compliance,
  ];
  let total = values.reduce((a, b) => a + b, 0) / values.length;
  for (const d of deductions) total += d.points;
  total = clamp(total);

  return {
    ...hook,
    score: { ...dims, deductions, total },
  };
}

export function scoreHooks(hooks: HookCandidate[], brief: CampaignBrief): ScoredHook[] {
  return hooks
    .map((h) => scoreHook(h, brief))
    .sort((a, b) => b.score.total - a.score.total);
}
