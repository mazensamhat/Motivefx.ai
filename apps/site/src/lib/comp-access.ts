export type CompAccessDuration = "1_month" | "2_months" | "3_months" | "lifetime";

export function computeAccessExpiresAt(duration: CompAccessDuration, from = new Date()): Date | null {
  if (duration === "lifetime") return null;
  const d = new Date(from);
  if (duration === "1_month") d.setMonth(d.getMonth() + 1);
  else if (duration === "2_months") d.setMonth(d.getMonth() + 2);
  else d.setMonth(d.getMonth() + 3);
  return d;
}

export function formatAccessExpiry(accessExpiresAt: Date | string | null | undefined): string {
  if (!accessExpiresAt) return "Lifetime";
  const d = typeof accessExpiresAt === "string" ? new Date(accessExpiresAt) : accessExpiresAt;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function isCompAccessExpired(
  accessExpiresAt: Date | string | null | undefined,
  hasStripeSubscription: boolean
): boolean {
  if (hasStripeSubscription || !accessExpiresAt) return false;
  const d = typeof accessExpiresAt === "string" ? new Date(accessExpiresAt) : accessExpiresAt;
  return d.getTime() <= Date.now();
}
