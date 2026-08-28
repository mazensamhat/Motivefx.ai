import { requireAdmin, getAdminApiKey } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getDataMode } from "@/lib/terminal/market-truth/data-mode";
import { listAiModelRegistry } from "@/lib/ops/ai-model-registry";
import { getAiUsageSummary } from "@/lib/ops/durable";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const openaiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
    const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
    const askMotiveEnabled = openaiConfigured || anthropicConfigured;
    const usage = await getAiUsageSummary(30);

    const askFeature = usage.byFeature.find((f) => f.feature === "ASK_MOTIVE");

    return json({
      generatedAt: new Date().toISOString(),
      dataMode: getDataMode(),
      flags: {
        openaiConfigured,
        anthropicConfigured,
        askMotiveEnabled,
        adminApiKeyConfigured: Boolean(getAdminApiKey()),
      },
      models: listAiModelRegistry(),
      usage,
      economics: {
        principle:
          "Never spend an AI token calculating something deterministic code can calculate (G5).",
        briefingBudgetNote:
          "Ask Motive calls are metered into OpsAiUsage with estimated USD from MOTIVEFX_AI_*_COST_PER_1M.",
        legacyViteAiNote:
          "web/src/components/AdminDashboard.tsx supports on-demand AI Ops Analysis via ADMIN_API_KEY — separate from session admin.",
      },
      stubMetrics: [
        {
          label: "AI requests (30d)",
          value: String(usage.requests),
          note: "OpsAiUsage rows",
        },
        {
          label: "Total tokens (30d)",
          value: usage.totalTokens.toLocaleString(),
          note: "Input + output",
        },
        {
          label: "Ask Motive calls (30d)",
          value: String(askFeature?.count ?? 0),
          note: askFeature ? `${askFeature.tokens} tokens` : "No metered calls yet",
        },
        {
          label: "Est. AI spend (30d)",
          value: `$${usage.totalCostUsd.toFixed(4)}`,
          note: `${usage.uniqueUsers} unique users · $${usage.costPerUser}/user`,
        },
      ],
    });
  } catch (error) {
    console.error("[admin/ai-costs]", error);
    return serverError("Could not load AI costs.");
  }
}
