import { prisma } from "@motivefx/database";

export type PlatformPref = { platformId: string; customUrl: string | null };

export async function getPlatformPrefs(userId: string): Promise<Record<string, PlatformPref>> {
  const rows = await prisma.platformPref.findMany({ where: { userId } });
  const out: Record<string, PlatformPref> = {};
  for (const row of rows) {
    out[row.module] = { platformId: row.platformId, customUrl: row.customUrl };
  }
  return out;
}

export async function savePlatformPrefs(
  userId: string,
  prefs: Record<string, PlatformPref>
) {
  for (const [module, pref] of Object.entries(prefs)) {
    await prisma.platformPref.upsert({
      where: { userId_module: { userId, module } },
      create: {
        userId,
        module,
        platformId: pref.platformId,
        customUrl: pref.customUrl,
      },
      update: {
        platformId: pref.platformId,
        customUrl: pref.customUrl,
      },
    });
  }
}
