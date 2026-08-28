import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import {
  buildCalibrationOpsAsync,
  buildDailyBriefOps,
  buildEvidenceQualityOps,
  buildIntelligenceDebugger,
  buildMarketDnaOps,
  buildOpportunityRadarOps,
  buildSignalGraphOps,
} from "@/lib/ops/intelligence-quality";
import { listAiModelRegistry } from "@/lib/ops/ai-model-registry";
import { listOpsJobs, listPipelineStats } from "@/lib/ops/jobs-pipelines";
import { getRecentTelemetryDurable } from "@/lib/ops/telemetry-envelope";
import { getAiUsageSummary } from "@/lib/ops/durable";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const url = new URL(request.url);
    const surface = url.searchParams.get("surface") ?? "all";
    const symbol = url.searchParams.get("symbol")?.trim();

    const payload: Record<string, unknown> = {
      generatedAt: new Date().toISOString(),
    };

    if (surface === "all" || surface === "evidence") payload.evidence = buildEvidenceQualityOps();
    if (surface === "all" || surface === "radar") payload.radar = buildOpportunityRadarOps();
    if (surface === "all" || surface === "graph") payload.graph = buildSignalGraphOps();
    if (surface === "all" || surface === "dna") payload.dna = buildMarketDnaOps();
    if (surface === "all" || surface === "brief") payload.brief = buildDailyBriefOps();
    if (surface === "all" || surface === "calibration") {
      payload.calibration = await buildCalibrationOpsAsync();
    }
    if (surface === "all" || surface === "ai") {
      const [recent, usage] = await Promise.all([
        getRecentTelemetryDurable(50),
        getAiUsageSummary(7),
      ]);
      payload.ai = {
        models: listAiModelRegistry(),
        recentAiEvents: recent.filter((e) => e.eventName.startsWith("ai.")),
        usage7d: usage,
      };
    }
    if (surface === "all" || surface === "jobs") payload.jobs = listOpsJobs();
    if (surface === "all" || surface === "pipelines") payload.pipelines = listPipelineStats();
    if (surface === "debugger" && symbol) {
      payload.debugger = buildIntelligenceDebugger(symbol);
    }

    return json(payload);
  } catch (error) {
    console.error("[admin/intelligence]", error);
    return serverError("Could not load intelligence ops");
  }
}
