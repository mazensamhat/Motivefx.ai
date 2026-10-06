import { prisma } from "@motivefx/database";
import { requireAdminCapability } from "@/lib/admin";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/lib/api";
import { recordAudit } from "@/lib/ops/audit";

export async function GET() {
  const auth = await requireAdminCapability("view_users");
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const rows = await prisma.productFeedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        email: true,
        kind: true,
        message: true,
        pagePath: true,
        status: true,
        priority: true,
        assignedTo: true,
        internalNote: true,
        resolvedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return json({
      generatedAt: new Date().toISOString(),
      counts: {
        total: rows.length,
        open: rows.filter((r) => r.status !== "resolved" && r.status !== "closed").length,
        urgent: rows.filter((r) => r.priority === "urgent" && r.status !== "resolved" && r.status !== "closed").length,
        resolved: rows.filter((r) => r.status === "resolved" || r.status === "closed").length,
      },
      feedback: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        message: r.message,
        pagePath: r.pagePath,
        status: r.status,
        priority: r.priority,
        assignedTo: r.assignedTo,
        internalNote: r.internalNote,
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        user: { email: r.email, name: null },
      })),
    });
  } catch (error) {
    console.error("[admin/feedback]", error);
    return serverError("Could not load support inbox.");
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminCapability("manage_users");
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      status?: "new" | "triaged" | "in_progress" | "waiting" | "resolved" | "closed";
      priority?: "low" | "normal" | "high" | "urgent";
      assignedTo?: string | null;
      internalNote?: string | null;
    };
    if (!body.id) return badRequest("id required");

    const before = await prisma.productFeedback.findUnique({
      where: { id: body.id },
      select: {
        status: true,
        priority: true,
        assignedTo: true,
        internalNote: true,
        resolvedAt: true,
      },
    });
    if (!before) return badRequest("feedback not found");

    const resolved =
      body.status === "resolved" || body.status === "closed"
        ? before.resolvedAt ?? new Date()
        : body.status
          ? null
          : undefined;

    const updated = await prisma.productFeedback.update({
      where: { id: body.id },
      data: {
        status: body.status,
        priority: body.priority,
        assignedTo: body.assignedTo === undefined ? undefined : body.assignedTo,
        internalNote: body.internalNote === undefined ? undefined : body.internalNote,
        resolvedAt: resolved,
      },
      select: {
        id: true,
        status: true,
        priority: true,
        assignedTo: true,
        internalNote: true,
        resolvedAt: true,
        updatedAt: true,
      },
    });

    recordAudit({
      actorId: auth.session.id,
      actorEmail: auth.session.email,
      action: "support.feedback.update",
      capability: "manage_users",
      risk: "MEDIUM",
      targetType: "feedback",
      targetId: body.id,
      result: "success",
      before,
      after: updated,
    });

    return json({
      ok: true,
      feedback: {
        ...updated,
        resolvedAt: updated.resolvedAt?.toISOString() ?? null,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[admin/feedback PATCH]", error);
    return serverError("Could not update support item.");
  }
}
