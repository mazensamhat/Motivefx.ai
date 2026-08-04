import { prisma } from "@motivefx/database";

/** Terminal / Ops module ids used in heatmaps and utilization. */
export const OPS_USAGE_MODULES = [
  "home",
  "trades",
  "crypto",
  "betting",
  "penny",
  "predictions",
  "api",
] as const;

export type OpsUsageModule = (typeof OPS_USAGE_MODULES)[number];

const ALLOWED = new Set<string>(OPS_USAGE_MODULES);

export function normalizeUsageModule(raw: string): string | null {
  const mod = raw.trim().toLowerCase();
  if (!mod || mod.length > 32) return null;
  if (ALLOWED.has(mod)) return mod;
  // Accept market ids from entitlements / URL tabs.
  const aliases: Record<string, string> = {
    stocks: "trades",
    pink_slips: "penny",
    "pink-slips": "penny",
    sports: "betting",
    sports_betting: "betting",
    prediction_markets: "predictions",
  };
  return aliases[mod] ?? null;
}

/**
 * Fire-and-forget usage metering for Ops heatmaps / DAU.
 * Never throws to callers.
 */
export async function recordUsageEvent(
  userId: string,
  module: string,
  action = "open",
  opts?: { durationMs?: number; statusCode?: number; endpoint?: string }
) {
  const mod = normalizeUsageModule(module);
  if (!mod) return;

  try {
    await prisma.usageEvent.create({
      data: {
        userId,
        module: mod,
        action: action.slice(0, 64),
        durationMs: opts?.durationMs,
        statusCode: opts?.statusCode ?? 200,
        endpoint: opts?.endpoint?.slice(0, 200),
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  } catch (error) {
    console.warn("[usage-events]", error);
  }
}
