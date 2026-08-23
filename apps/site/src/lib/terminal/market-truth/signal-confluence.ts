/**
 * G2 Motive Signal presentation — strength of evidence alignment, not probability %.
 */

export type MotiveStance =
  | "Very Strong Constructive"
  | "Constructive"
  | "Mild Constructive"
  | "Mixed"
  | "Defensive"
  | "Strong Defensive";

export type ConfidenceBand = "High" | "Moderate" | "Low";

/** Score is 0–100 Motive Signal (alignment strength), never a calibrated probability. */
export function classifyMotiveStance(score: number): MotiveStance {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s >= 85) return "Very Strong Constructive";
  if (s >= 70) return "Constructive";
  if (s >= 55) return "Mild Constructive";
  if (s >= 45) return "Mixed";
  if (s >= 30) return "Defensive";
  return "Strong Defensive";
}

export function formatMotiveSignalLabel(score: number): string {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  return `Motive Signal: ${classifyMotiveStance(s)} · ${s}/100`;
}

export function confidenceFromEvidenceQuality(evidenceQuality: number): ConfidenceBand {
  const q = Math.max(0, Math.min(100, Math.round(evidenceQuality)));
  if (q >= 75) return "High";
  if (q >= 50) return "Moderate";
  return "Low";
}

/** Strip first-person / execution language from model or template copy. */
const PROHIBITED_CLAIM_PATTERNS: RegExp[] = [
  /\bi would buy\b/i,
  /\bi would hold\b/i,
  /\bi wouldn't buy\b/i,
  /\bi would not buy\b/i,
  /\bsafe bet\b/i,
  /\bguaranteed\b/i,
  /\byou should buy\b/i,
  /\bplace \$?\d+/i,
  /\bput \$?\d+ on\b/i,
  /\b\d{1,3}%\s*(chance|probability)\s*(of\s+)?(profit|rising|upside)/i,
];

export function containsProhibitedClaimLanguage(text: string): boolean {
  return PROHIBITED_CLAIM_PATTERNS.some((re) => re.test(text));
}
