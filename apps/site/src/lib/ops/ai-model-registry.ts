/**
 * AI model / prompt version registry (Ops Master Plan §44–45).
 * Never silently change production prompts — every change needs version + operator.
 */

export type AiFeature =
  | "ASK_MOTIVE"
  | "DAILY_BRIEF"
  | "SIGNAL_EXPLANATION"
  | "PORTFOLIO_EXPLANATION"
  | "RADAR_EXPLANATION"
  | "MARKET_DNA"
  | "OPS_ASSISTANT";

export type AiGroundingClass =
  | "GROUNDED"
  | "PARTIALLY_GROUNDED"
  | "UNSUPPORTED"
  | "FAILED_VALIDATION";

export type AiModelRegistryEntry = {
  feature: AiFeature;
  model: string;
  promptVersion: string;
  temperature: number;
  maxTokens: number;
  fallbackModel?: string;
  structuredSchema?: string;
  lastChangedAt: string;
  changedBy: string;
  notes?: string;
};

const REGISTRY: AiModelRegistryEntry[] = [
  {
    feature: "ASK_MOTIVE",
    model: "gpt-4.1-mini",
    promptVersion: "ask-motive-v1",
    temperature: 0.3,
    maxTokens: 1200,
    structuredSchema: "askMotive-v1",
    lastChangedAt: "2026-08-01T00:00:00.000Z",
    changedBy: "system",
  },
  {
    feature: "DAILY_BRIEF",
    model: "gpt-4.1-mini",
    promptVersion: "brief-v1",
    temperature: 0.2,
    maxTokens: 2000,
    structuredSchema: "dailyBrief-v1",
    lastChangedAt: "2026-08-01T00:00:00.000Z",
    changedBy: "system",
  },
  {
    feature: "SIGNAL_EXPLANATION",
    model: "gpt-4.1-mini",
    promptVersion: "signal-explain-v1",
    temperature: 0.2,
    maxTokens: 800,
    structuredSchema: "signalExplain-v1",
    lastChangedAt: "2026-08-01T00:00:00.000Z",
    changedBy: "system",
  },
  {
    feature: "RADAR_EXPLANATION",
    model: "gpt-4.1-mini",
    promptVersion: "radar-explain-v1",
    temperature: 0.2,
    maxTokens: 800,
    lastChangedAt: "2026-08-01T00:00:00.000Z",
    changedBy: "system",
  },
  {
    feature: "MARKET_DNA",
    model: "gpt-4.1-mini",
    promptVersion: "dna-explain-v1",
    temperature: 0.2,
    maxTokens: 800,
    lastChangedAt: "2026-08-01T00:00:00.000Z",
    changedBy: "system",
  },
  {
    feature: "PORTFOLIO_EXPLANATION",
    model: "gpt-4.1-mini",
    promptVersion: "portfolio-explain-v1",
    temperature: 0.2,
    maxTokens: 800,
    lastChangedAt: "2026-08-01T00:00:00.000Z",
    changedBy: "system",
  },
];

export function listAiModelRegistry(): AiModelRegistryEntry[] {
  return [...REGISTRY];
}

export function getAiModelForFeature(feature: AiFeature): AiModelRegistryEntry | null {
  return REGISTRY.find((e) => e.feature === feature) ?? null;
}

/** Signal explainability contract (Ops Master Plan §19). Score ≠ confidence. */
export type SignalExplainability = {
  signalId: string;
  symbol?: string;
  themeId?: string;
  signalScore: number;
  confidence: number;
  status: string;
  horizon?: string;
  calculationVersion: string;
  baseScore: number;
  evidenceStrength: number;
  evidenceDiversity: number;
  freshnessWeight: number;
  crossSourceAgreement: number;
  historicalAnalogue: number;
  momentum: number;
  counterEvidence: number;
  uncertaintyAdjustment: number;
  inputSignals: { label: string; contribution: number }[];
  counterSignals: { label: string; contribution: number }[];
  aiExplanationGrounding?: AiGroundingClass;
};

/** Confidence calibration bucket (Ops Master Plan §20). */
export type ConfidenceCalibrationBucket = {
  bucket: string;
  predictedMin: number;
  predictedMax: number;
  observedReliability: number | null;
  sampleSize: number;
  warning: boolean;
};
