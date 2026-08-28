import { requireAdmin } from "@/lib/admin";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/lib/api";
import { acknowledgeIncident, listOpsIncidents } from "@/lib/ops/incidents";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const incidents = await listOpsIncidents();
    return json({
      generatedAt: new Date().toISOString(),
      incidents,
      open: incidents.filter((i) => i.status === "open").length,
      critical: incidents.filter((i) => i.severity === "CRITICAL").length,
    });
  } catch (error) {
    console.error("[admin/incidents]", error);
    return serverError("Could not load incidents");
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const body = (await request.json()) as {
      incidentId?: string;
      status?: "acknowledged" | "investigating" | "resolved";
    };
    if (!body.incidentId) return badRequest("incidentId required");
    acknowledgeIncident({
      incidentId: body.incidentId,
      actorId: auth.session.id,
      actorEmail: auth.session.email,
      status: body.status,
    });
    return json({ ok: true });
  } catch (error) {
    console.error("[admin/incidents POST]", error);
    return serverError("Could not update incident");
  }
}
