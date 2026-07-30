import { prisma } from "@motivefx/database";
import { DEFAULT_INTEL_PREFS, normalizePrefs } from "./engines/predictive";
import type { IntelPrefs } from "./engines/types";

export async function getIntelPrefs(userId: string | null | undefined): Promise<IntelPrefs> {
  if (!userId || userId === "demo" || userId.startsWith("u_")) {
    return {
      themeWatchlist: [...DEFAULT_INTEL_PREFS.themeWatchlist],
      alertRules: [...DEFAULT_INTEL_PREFS.alertRules],
    };
  }
  try {
    const row = await prisma.userIntelPref.findUnique({ where: { userId } });
    if (!row?.prefsJson) {
      return {
        themeWatchlist: [],
        alertRules: [...DEFAULT_INTEL_PREFS.alertRules],
      };
    }
    return normalizePrefs(JSON.parse(row.prefsJson));
  } catch {
    return {
      themeWatchlist: [],
      alertRules: [...DEFAULT_INTEL_PREFS.alertRules],
    };
  }
}

export async function saveIntelPrefs(userId: string, prefs: IntelPrefs): Promise<IntelPrefs> {
  const existing = await getIntelPrefs(userId);
  const merged: IntelPrefs = {
    ...prefs,
    portfolioBooks: prefs.portfolioBooks ?? existing.portfolioBooks,
  };
  const normalized = normalizePrefs(merged);
  if (!userId || userId === "demo" || userId.startsWith("u_")) {
    return normalized;
  }
  try {
    await prisma.userIntelPref.upsert({
      where: { userId },
      create: { userId, prefsJson: JSON.stringify(normalized) },
      update: { prefsJson: JSON.stringify(normalized) },
    });
  } catch {
    /* table may not exist until migrate — still return normalized for session use */
  }
  return normalized;
}
