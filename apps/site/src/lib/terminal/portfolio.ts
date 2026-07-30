import { prisma } from "@motivefx/database";
import { getIntelPrefs, saveIntelPrefs } from "@/lib/terminal/intel-prefs";
import type { ModulePortfolioBooks, PortfolioBook } from "@/lib/terminal/engines/types";

export type Holding = {
  symbol: string;
  shares?: number;
  amount?: number;
  avg_cost?: number;
};

const MODULE_KEYS = ["trades", "crypto", "penny"] as const;
export type PortfolioModule = (typeof MODULE_KEYS)[number];

export const MAX_PORTFOLIO_BOOKS = 5;

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

export async function savePortfolio(
  userId: string,
  module: PortfolioModule,
  holdings: Holding[],
  opts?: { skipBookSync?: boolean }
) {
  await prisma.userPortfolio.upsert({
    where: { userId_module: { userId, module } },
    create: { userId, module, holdingsJson: JSON.stringify(holdings) },
    update: { holdingsJson: JSON.stringify(holdings) },
  });
  if (opts?.skipBookSync) return;
  // Keep active named book in sync when Ultra+ books exist
  try {
    const prefs = await getIntelPrefs(userId);
    const state = prefs.portfolioBooks?.[module];
    if (!state?.activeId) return;
    const now = new Date().toISOString();
    const books = state.books.map((b) =>
      b.id === state.activeId ? { ...b, holdings, updatedAt: now } : b
    );
    await saveIntelPrefs(userId, {
      ...prefs,
      portfolioBooks: {
        ...prefs.portfolioBooks,
        [module]: { ...state, books },
      },
    });
  } catch {
    /* non-fatal */
  }
}

function defaultBooks(holdings: Holding[]): ModulePortfolioBooks {
  const book: PortfolioBook = {
    id: "primary",
    name: "Primary",
    holdings,
    updatedAt: new Date().toISOString(),
  };
  return { activeId: "primary", books: [book] };
}

export async function listPortfolioBooks(userId: string, module: PortfolioModule) {
  const holdings = await loadPortfolio(userId, module);
  const prefs = await getIntelPrefs(userId);
  let state = prefs.portfolioBooks?.[module];
  if (!state?.books?.length) {
    state = defaultBooks(holdings);
    await saveIntelPrefs(userId, {
      ...prefs,
      portfolioBooks: { ...prefs.portfolioBooks, [module]: state },
    });
  }
  return state;
}

export async function createPortfolioBook(
  userId: string,
  module: PortfolioModule,
  name: string
): Promise<ModulePortfolioBooks> {
  const state = await listPortfolioBooks(userId, module);
  if (state.books.length >= MAX_PORTFOLIO_BOOKS) {
    throw new Error(`Maximum ${MAX_PORTFOLIO_BOOKS} portfolios per market`);
  }
  // Persist current ledger into active book before switching
  const current = await loadPortfolio(userId, module);
  const now = new Date().toISOString();
  const synced = state.books.map((b) =>
    b.id === state.activeId ? { ...b, holdings: current, updatedAt: now } : b
  );
  const id = `book_${Date.now()}`;
  const next: ModulePortfolioBooks = {
    activeId: id,
    books: [
      ...synced,
      { id, name: name.trim().slice(0, 40) || `Portfolio ${synced.length + 1}`, holdings: [], updatedAt: now },
    ],
  };
  const prefs = await getIntelPrefs(userId);
  await saveIntelPrefs(userId, {
    ...prefs,
    portfolioBooks: { ...prefs.portfolioBooks, [module]: next },
  });
  await savePortfolio(userId, module, [], { skipBookSync: true });
  return next;
}

export async function switchPortfolioBook(
  userId: string,
  module: PortfolioModule,
  bookId: string
): Promise<ModulePortfolioBooks> {
  const state = await listPortfolioBooks(userId, module);
  const target = state.books.find((b) => b.id === bookId);
  if (!target) throw new Error("Portfolio not found");
  if (bookId === state.activeId) return state;

  const current = await loadPortfolio(userId, module);
  const now = new Date().toISOString();
  const books = state.books.map((b) => {
    if (b.id === state.activeId) return { ...b, holdings: current, updatedAt: now };
    return b;
  });
  const next: ModulePortfolioBooks = { activeId: bookId, books };
  const prefs = await getIntelPrefs(userId);
  await saveIntelPrefs(userId, {
    ...prefs,
    portfolioBooks: { ...prefs.portfolioBooks, [module]: next },
  });
  await savePortfolio(userId, module, target.holdings as Holding[], { skipBookSync: true });
  return next;
}

export async function renamePortfolioBook(
  userId: string,
  module: PortfolioModule,
  bookId: string,
  name: string
): Promise<ModulePortfolioBooks> {
  const state = await listPortfolioBooks(userId, module);
  const next: ModulePortfolioBooks = {
    ...state,
    books: state.books.map((b) =>
      b.id === bookId ? { ...b, name: name.trim().slice(0, 40) || b.name } : b
    ),
  };
  const prefs = await getIntelPrefs(userId);
  await saveIntelPrefs(userId, {
    ...prefs,
    portfolioBooks: { ...prefs.portfolioBooks, [module]: next },
  });
  return next;
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

export async function portfolioSnapshot(userId: string): Promise<{
  counts: Record<PortfolioModule, number>;
  symbols: Record<PortfolioModule, string[]>;
}> {
  const rows = await prisma.userPortfolio.findMany({ where: { userId } });
  const counts: Record<PortfolioModule, number> = { trades: 0, crypto: 0, penny: 0 };
  const symbols: Record<PortfolioModule, string[]> = { trades: [], crypto: [], penny: [] };

  for (const row of rows) {
    if (!isPortfolioModule(row.module)) continue;
    try {
      const parsed = JSON.parse(row.holdingsJson) as unknown;
      if (!Array.isArray(parsed)) continue;
      const holdings = parsed as Holding[];
      counts[row.module] = holdings.length;
      symbols[row.module] = holdings.map((h) => h.symbol.toUpperCase());
    } catch {
      /* ok */
    }
  }

  return { counts, symbols };
}
