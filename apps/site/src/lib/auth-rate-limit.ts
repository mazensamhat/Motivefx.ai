import { createHash } from "crypto";
import { prisma } from "@motivefx/database";

function hashIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 40);
}

export function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("x-vercel-forwarded-for")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    forwarded ||
    "unknown"
  );
}

/**
 * Durable DB-backed auth throttle. Identifiers are hashed before storage so the
 * rate-limit ledger does not retain raw email/IP combinations.
 */
export async function consumeAuthRateLimit(input: {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
}): Promise<boolean> {
  const action = `auth.rate_limit.${input.scope}`;
  const targetId = hashIdentifier(`${input.scope}:${input.identifier}`);
  const since = new Date(Date.now() - input.windowMs);

  const count = await prisma.opsAuditEvent.count({
    where: {
      action,
      targetId,
      observedAt: { gte: since },
    },
  });
  if (count >= input.limit) return false;

  await prisma.opsAuditEvent.create({
    data: {
      actorId: "anonymous",
      actorEmail: "anonymous@motivefx.local",
      action,
      capability: null,
      risk: "LOW",
      targetType: "auth_rate_limit",
      targetId,
      reason: null,
      beforeJson: null,
      afterJson: null,
      result: "attempt",
      environment:
        process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV?.trim() || "unknown",
    },
  });
  return true;
}
