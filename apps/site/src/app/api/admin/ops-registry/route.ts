import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getRecentAudit } from "@/lib/ops/audit";
import { listAiModelRegistry } from "@/lib/ops/ai-model-registry";
import { MOTIVEFX_EVENTS } from "@/lib/ops/event-registry";
import { MOTIVEFX_DESKS, MOTIVEFX_PRODUCTS } from "@/lib/ops/product-registry";
import { OPS_CAPABILITIES } from "@/lib/ops/rbac";
import { listSourceRights } from "@/lib/ops/source-rights";
import { getRecentTelemetry, telemetryInstrumentationStats } from "@/lib/ops/telemetry-envelope";
import { TRUTH_STATES } from "@/lib/ops/truth-state";

/** P0 registry / governance snapshot for Settings + Releases. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    return json({
      generatedAt: new Date().toISOString(),
      planVersion: "1.0",
      products: MOTIVEFX_PRODUCTS,
      desks: MOTIVEFX_DESKS,
      events: MOTIVEFX_EVENTS,
      truthStates: TRUTH_STATES,
      capabilities: OPS_CAPABILITIES,
      sourceRights: listSourceRights(),
      aiModels: listAiModelRegistry(),
      telemetry: {
        ...telemetryInstrumentationStats(),
        recent: getRecentTelemetry(25),
      },
      audit: getRecentAudit(25),
    });
  } catch (error) {
    console.error("[admin/ops-registry]", error);
    return serverError("Could not load ops registry.");
  }
}
