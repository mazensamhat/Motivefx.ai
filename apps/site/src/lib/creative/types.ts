/**
 * MotiveFX Creative Intelligence — types + campaign inputs.
 * Doctrine: Don't advertise a prediction. Advertise the intelligence behind the decision.
 */

export const CREATIVE_DOCTRINE =
  "Don't advertise a prediction. Advertise the intelligence behind the decision.";

export const CREATIVE_POSITIONING =
  "Don't sell “AI trading.” Sell clarity when the market is noisy.";

export type CreativeObjective =
  | "awareness"
  | "product_education"
  | "signup"
  | "trial"
  | "feature_adoption";

export type TraderPersona =
  | "beginner"
  | "intermediate"
  | "experienced"
  | "technical"
  | "overtrader"
  | "signal_seeker";

export type CreativeAngle =
  | "evidence"
  | "confluence"
  | "confidence"
  | "market_truth"
  | "ai_explanation"
  | "timing"
  | "risk_awareness";

export type CreativeMode = "EVERGREEN" | "MARKET_AWARE" | "LIVE_MARKET";

export type CreativePlatform =
  | "tiktok"
  | "reels"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "x"
  | "youtube_shorts";

export type HookFamily =
  | "market_confusion"
  | "signal_overload"
  | "contrarian"
  | "decision_tension"
  | "missed_context"
  | "confluence"
  | "timing"
  | "demonstration"
  | "trader_pain"
  | "pattern_interrupt"
  | "evidence_challenge"
  | "ai_misconception";

export type TruthClass = "LIVE" | "DELAYED" | "HISTORICAL" | "SIMULATED" | "DEMO" | "EVERGREEN";

export type CampaignBrief = {
  objective: CreativeObjective;
  trader: TraderPersona;
  angle: CreativeAngle;
  mode: CreativeMode;
  platform: CreativePlatform;
  symbol?: string;
  featureFocus?: string;
  /** Structured Market Truth payload — required for LIVE_MARKET. */
  marketTruth?: MarketTruthStoryInput | null;
};

export type MarketTruthStoryInput = {
  symbol: string;
  stance?: string;
  motiveSignal?: number | null;
  confidence?: number | null;
  truthClass: TruthClass;
  evidence: { label: string; stance: string; note?: string }[];
  asOf?: string;
  sourcesKnown: boolean;
};

export type HookCandidate = {
  id: string;
  family: HookFamily;
  text: string;
  battleLane: "A" | "B" | "C" | "D" | "E" | "OTHER";
};

export type HookScoreBreakdown = {
  scrollStop: number;
  traderRecognition: number;
  marketTension: number;
  curiosity: number;
  specificity: number;
  clarity: number;
  productConnection: number;
  evidenceOrientation: number;
  credibility: number;
  compliance: number;
  deductions: { reason: string; points: number }[];
  total: number;
};

export type ScoredHook = HookCandidate & { score: HookScoreBreakdown };

export type MarketStory = {
  marketEvent: string;
  tension: string;
  evidence: string;
  confluence: string;
  motiveSignal: string;
  explanation: string;
  truthClass: TruthClass;
  symbol?: string;
};

export type CaptionPackage = {
  hook: string;
  traderRecognition: string;
  marketTension: string;
  evidence: string;
  motiveReveal: string;
  insight: string;
  cta: string;
  fullCaption: string;
};

export type VisualConceptId = "conflicting_evidence" | "confluence" | "confidence_board";

export type VisualConcept = {
  id: VisualConceptId;
  headline: string;
  rows: { label: string; value: string }[];
  resolution: string;
  truthClass: TruthClass;
  notes: string;
};

export type VideoBeat = {
  startSec: number;
  endSec: number;
  onScreen: string;
  voiceOrSuper: string;
};

export type VideoConcept = {
  title: string;
  beats: VideoBeat[];
  closingLine: string;
};

export type CriticFinding = {
  severity: "info" | "warn" | "block";
  code: string;
  message: string;
};

export type CriticReport = {
  pass: boolean;
  score: number;
  findings: CriticFinding[];
  summary: string;
};

export type CreativeHypothesis = {
  id: string;
  label: string;
  hook: ScoredHook;
  caption: CaptionPackage;
  visual: VisualConcept;
  video: VideoConcept;
  creativeCritic: CriticReport;
  financialClaimsCritic: CriticReport;
  publishBlocked: boolean;
  blockReasons: string[];
};

export type CreativeBattleResult = {
  lanes: { lane: string; hook: ScoredHook }[];
  recommended: ScoredHook;
  challenger: ScoredHook | null;
};

export type CreativePipelineResult = {
  generatedAt: string;
  doctrine: string;
  positioning: string;
  brief: CampaignBrief;
  hooks: ScoredHook[];
  battle: CreativeBattleResult;
  marketStory: MarketStory;
  hypotheses: CreativeHypothesis[];
  approvalReady: CreativeHypothesis[];
  blocked: CreativeHypothesis[];
};
