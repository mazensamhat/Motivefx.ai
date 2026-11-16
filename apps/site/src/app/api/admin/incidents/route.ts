import { z } from "zod";
import { requireAdminCapability } from "@/lib/admin";
import { badRequest, forbidden, json, notFound, serverError, unauthorized } from "@/lib/api";
import { acknowledgeIncident, forecastOpsRisks, listOpsIncidents } from "@/lib/ops/incidents";

export async function GET() {
  const auth = await requireAdminCapability("view_audit");
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const [incidents, forecasts] = await Promise.all([
      listOpsIncidents(),
      forecastOpsRisks(),
    ]);
    return json({
      generatedAt: new Date().toISOString(),
      incidents,
      forecasts,
      canManage: auth.actor.capabilities.has("manage_runtime_config"),
      open: incidents.filter((i) => i.status !== "resolved").length,
      critical: incidents.filter((i) => i.severity === "CRITICAL" && i.status !== "resolved").length,
      forecastHigh: forecasts.filter((i) => i.severity === "HIGH").length,
    }, 200, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin/incidents]", error);
    return serverError("Could not load incidents");
  }
}

const updateSchema = z.object({
  incidentId: z.string().trim().min(1).max(256),
  status: z.enum(["acknowledged", "investigating", "resolved"]).default("acknowledged"),
}).strict();

export async function POST(request: Request) {
  const auth = await requireAdminCapability("manage_runtime_config");
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return forbidden("Cross-origin update rejected");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return badRequest("JSON body required");
  }
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Valid incidentId and status required");

  try {
    const updated = await acknowledgeIncident({
      incidentId: parsed.data.incidentId,
      actorId: auth.session.id,
      actorEmail: auth.session.email,
      status: parsed.data.status,
    });
    if (!updated) return notFound("Incident not found");
    return json({ ok: true, status: parsed.data.status });
  } catch (error) {
    console.error("[admin/incidents POST]", error);
    return serverError("Could not update incident");
  }
}
