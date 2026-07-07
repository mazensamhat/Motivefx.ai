import { prisma } from "@motivefx/database";
import { forbidden, unauthorized } from "../api";
import { getSession } from "../session";
import type { User } from "@prisma/client";

export type TerminalSession = {
  user: User;
};

export async function requireTerminalSession(): Promise<
  { ok: true; session: TerminalSession } | { ok: false; response: Response }
> {
  const cookie = await getSession();
  if (!cookie) {
    return { ok: false, response: unauthorized() };
  }

  const user = await prisma.user.findUnique({ where: { id: cookie.id } });
  if (!user || user.disabledAt) {
    return { ok: false, response: unauthorized() };
  }

  void prisma.user
    .update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => undefined);

  return { ok: true, session: { user } };
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
  throw err;
}
