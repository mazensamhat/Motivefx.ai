import { prisma } from "@motivefx/database";

export type WatchlistItem = { module: string; symbol: string; created_at: string };

export async function listWatchlist(userId: string): Promise<WatchlistItem[]> {
  const rows = await prisma.watchlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    module: r.module,
    symbol: r.symbol,
    created_at: r.createdAt.toISOString(),
  }));
}

export async function addWatchlistItem(userId: string, module: string, symbol: string) {
  await prisma.watchlistItem.upsert({
    where: { userId_module_symbol: { userId, module, symbol: symbol.toUpperCase() } },
    create: { userId, module, symbol: symbol.toUpperCase() },
    update: {},
  });
}

export async function removeWatchlistItem(userId: string, module: string, symbol: string) {
  await prisma.watchlistItem.deleteMany({
    where: { userId, module, symbol: symbol.toUpperCase() },
  });
}

export async function userTrackedSymbols(userId: string): Promise<Set<string>> {
  const items = await listWatchlist(userId);
  const portfolios = await prisma.userPortfolio.findMany({ where: { userId } });
  const symbols = new Set<string>();
  for (const item of items) {
    symbols.add(item.symbol.toUpperCase());
  }
  for (const row of portfolios) {
    try {
      const parsed = JSON.parse(row.holdingsJson) as Array<{ symbol?: string }>;
      for (const h of parsed) {
        if (h.symbol) symbols.add(h.symbol.toUpperCase());
      }
    } catch {
      /* ok */
    }
  }
  return symbols;
}
