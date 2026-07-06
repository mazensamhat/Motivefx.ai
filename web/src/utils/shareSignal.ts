import type { SignalDetailPayload } from "./signalIntel";

export function formatSignalShareText(
  p: Pick<SignalDetailPayload, "title" | "symbol" | "confidence" | "definition" | "contextLines" | "category"> & {
    reasons?: string[];
  }
): string {
  const lines = [
    "MotiveFX Signal Intel",
    p.symbol ? `$${p.symbol} · ${p.title}` : p.title,
    p.confidence != null ? `Confidence: ${p.confidence}%` : "",
    p.category ? `[${p.category}]` : "",
    "",
    p.definition,
  ];

  const context = p.contextLines ?? p.reasons ?? [];
  if (context.length) {
    lines.push("", ...context.map((c) => `• ${c}`));
  }

  lines.push("", "Informational only · Not financial advice · motivefx.ai");
  return lines.filter((l) => l !== "").join("\n");
}
