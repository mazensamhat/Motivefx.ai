import { prisma } from "@motivefx/database";
import { forbidden, unauthorized } from "../api";
import { findUserSafe, findUserSafeCached } from "../load-user";
import { getEffectiveSession } from "@/lib/ops/impersonation";
import type { User } from "@prisma/client";

export type TerminalSession = {
  user: User;
  impersonating?: boolean;
  operatorId?: string;
};

const LAST_SEEN_TTL_MS = 15 * 60 * 1000;
const lastSeenAt = (globalThis as unknown as { __motivefxLastSeen?: Map<string, number> })
  .__motivefxLastSeen ?? new Map<string, number>();
(globalThis as unknown as { __motivefxLastSeen?: Map<string, number> }).__motivefxLastSeen =
  lastSeenAt;

function touchLastSeen(userId: string) {
  const now = Date.now();
  const prev = lastSeenAt.get(userId) ?? 0;
  if (now - prev < LAST_SEEN_TTL_MS) return;
  lastSeenAt.set(userId, now);
  // Fire-and-forget; never block the request or hold the pool waiting.
  void prisma.user
    .update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => undefined);
}

export async function requireTerminalSession(): Promise<
  { ok: true; session: TerminalSession } | { ok: false; response: Response }
> {
  const cookie = await getEffectiveSession();
  if (!cookie) {
    return { ok: false, response: unauthorized() };
  }

  const user = await findUserSafeCached({ id: cookie.id });
  if (!user || user.disabledAt) {
    return { ok: false, response: unauthorized() };
  }

  // Don't pollute customer lastSeen while support is viewing as them
  if (!cookie.impersonating) {
    touchLastSeen(user.id);
  }

  return {
    ok: true,
    session: {
      user,
      impersonating: cookie.impersonating,
      operatorId: cookie.operatorId,
    },
  };
}

export function assertUserMatch(session: TerminalSession, requestedUserId: string) {
  if (session.user.id !== requestedUserId) {
    throw new AccessDeniedError();
  }
}

export class AccessDeniedError extends Error {
  constructor(message = "Access denied") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

export class ModuleLockedError extends Error {
  module: string;
  constructor(module: string) {
    super("Subscribe to unlock this intelligence market.");
    this.name = "ModuleLockedError";
    this.module = module;
  }
}

export class FeatureLockedError extends Error {
  feature: string;
  constructor(feature: string, label: string) {
    super(`Upgrade your plan to unlock ${label}.`);
    this.name = "FeatureLockedError";
    this.feature = feature;
  }
}

export function accessErrorResponse(err: unknown) {
  if (err instanceof ModuleLockedError) {
    return Response.json(
      { detail: { code: "module_locked", module: err.module, message: err.message } },
      { status: 403 }
    );
  }
  if (err instanceof FeatureLockedError) {
    return Response.json(
      { detail: { code: "tier_locked", feature: err.feature, message: err.message } },
      { status: 403 }
    );
  }
  if (err instanceof AccessDeniedError) {
    return forbidden(err.message);
  }
  if (err instanceof Error) {
    return Response.json({ error: err.message, detail: err.message }, { status: 400 });
  }
  throw err;
}

export { findUserSafe };
