import { requireAdmin, getAdminApiKey } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getDataMode } from "@/lib/terminal/market-truth/data-mode";

import { listAiModelRegistry } from "@/lib/ops/ai-model-registry";

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
      economics: {
        principle:
          "Never spend an AI token calculating something deterministic code can calculate (G5).",
        briefingBudgetNote:
          "MotiveBriefingContext one-call pattern and token budgets ship with G5 — per-user metering not yet exposed in site admin API.",
        legacyViteAiNote:
          "web/src/components/AdminDashboard.tsx supports on-demand AI Ops Analysis via ADMIN_API_KEY — separate from session admin.",
      },
      stubMetrics: [
        {
          label: "Token metering API",
          value: "Pending G5",
          note: "No /api/admin/ai-usage yet",
        },
        {
          label: "Briefing AI calls (24h)",
          value: "—",
          note: "Requires log aggregation",
        },
        {
          label: "Ask Motive sessions (24h)",
          value: "—",
          note: "Requires log aggregation",
        },
        {
          label: "Est. AI spend (30d)",
          value: "—",
          note: "Wire from provider billing or Coralogix",
        },
      ],
    });
  } catch (error) {
    console.error("[admin/ai-costs]", error);
    return serverError("Could not load AI costs.");
  }
}
