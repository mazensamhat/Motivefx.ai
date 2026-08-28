import { requireAdmin } from "@/lib/admin";
import { badRequest, forbidden, json, serverError, unauthorized } from "@/lib/api";
import { prisma } from "@motivefx/database";
import {
  endImpersonation,
  getActiveImpersonation,
  startImpersonation,
  IMPERSONATION_BLOCKED_ACTIONS,
} from "@/lib/ops/impersonation";
import type { ImpersonationMode } from "@/lib/ops/rbac";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  const session = await getActiveImpersonation(auth.session.id);
  return json({
    active: session
      ? {
          effectiveUserId: session.effectiveUserId,
          mode: session.mode,
          reason: session.reason,
          expiresAt: session.expiresAt,
          impersonationSessionId: session.impersonationSessionId,
        }
      : null,
    effectiveUserEmail: session?.effectiveUserEmail ?? null,
    blockedActions: IMPERSONATION_BLOCKED_ACTIONS,
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const body = (await request.json()) as {
      userId?: string;
      reason?: string;
      ticketId?: string;
      mode?: ImpersonationMode;
    };
    if (!body.userId?.trim()) return badRequest("userId required");
    if (!body.reason?.trim()) return badRequest("reason required");

    const user = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, email: true },
    });
    if (!user) return badRequest("User not found");
    if (user.id === auth.session.id) return badRequest("Cannot impersonate yourself");

    const session = await startImpersonation({
      operatorId: auth.session.id,
      operatorEmail: auth.session.email,
      effectiveUserId: user.id,
      effectiveUserEmail: user.email,
      reason: body.reason,
      ticketId: body.ticketId,
      mode: body.mode ?? "VIEW_AS_USER",
    });

    return json({ ok: true, session, effectiveUserEmail: user.email });
  } catch (error) {
    console.error("[admin/impersonation POST]", error);
    return serverError("Could not start impersonation");
  }
}

export async function DELETE() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  const ended = await endImpersonation(auth.session.id, auth.session.email);
  return json({ ok: true, ended });
}
