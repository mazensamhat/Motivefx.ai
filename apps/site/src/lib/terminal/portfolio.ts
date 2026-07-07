import { prisma } from "@motivefx/database";

export type Holding = {
  symbol: string;
  shares?: number;
  amount?: number;
  avg_cost?: number;
};

const MODULE_KEYS = ["trades", "crypto", "penny"] as const;
export type PortfolioModule = (typeof MODULE_KEYS)[number];

export function isPortfolioModule(module: string): module is PortfolioModule {
  return (MODULE_KEYS as readonly string[]).includes(module);
}

export async function loadPortfolio(userId: string, module: PortfolioModule): Promise<Holding[]> {
  const row = await prisma.userPortfolio.findUnique({
    where: { userId_module: { userId, module } },
  });
  if (!row) return [];
  try {
    const parsed = JSON.parse(row.holdingsJson) as unknown;
    return Array.isArray(parsed) ? (parsed as Holding[]) : [];
  } catch {
    return [];
  }
}

export async function savePortfolio(userId: string, module: PortfolioModule, holdings: Holding[]) {
  await prisma.userPortfolio.upsert({
    where: { userId_module: { userId, module } },
    create: { userId, module, holdingsJson: JSON.stringify(holdings) },
    update: { holdingsJson: JSON.stringify(holdings) },
  });
}

export async function countAllHoldings(userId: string): Promise<number> {
  const rows = await prisma.userPortfolio.findMany({ where: { userId } });
  let total = 0;
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.holdingsJson) as unknown;
      if (Array.isArray(parsed)) total += parsed.length;
    } catch {
      /* ok */
    }
  }
  return total;
}
