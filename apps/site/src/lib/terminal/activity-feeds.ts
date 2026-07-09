export type ActivityQuery = {
  symbol?: string;
  side?: string;
  dateFrom?: string;
  dateTo?: string;
  minShares?: number;
  minPrice?: number;
  maxPrice?: number;
  minAmount?: number;
};

export function parseActivityQuery(request: Request): ActivityQuery {
  const p = new URL(request.url).searchParams;
  const maxPrice = p.get("max_price");
  return {
    symbol: p.get("symbol")?.trim().toUpperCase() || undefined,
    side: p.get("side")?.trim().toLowerCase() || undefined,
    dateFrom: p.get("date_from")?.trim() || undefined,
    dateTo: p.get("date_to")?.trim() || undefined,
    minShares: Number(p.get("min_shares") || 0) || undefined,
    minPrice: Number(p.get("min_price") || 0) || undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minAmount: Number(p.get("min_amount") || 0) || undefined,
  };
}

export function normalizeSide(raw: unknown): "buy" | "sell" {
  const s = String(raw ?? "").toLowerCase();
  if (s === "sell" || s === "sale" || s === "s" || s === "put" || s === "withdrawal") return "sell";
  return "buy";
}

function inDateRange(ts: string | undefined, from?: string, to?: string): boolean {
  if (!ts) return true;
  const t = new Date(ts).getTime();
  if (from && t < new Date(from).getTime()) return false;
  if (to && t > new Date(to).getTime()) return false;
  return true;
}

export function filterStockActivity<
  T extends {
    symbol?: string;
    side?: string;
    shares?: number;
    price?: number;
    amountUsd?: number;
    timestamp?: string;
  },
>(items: T[], q: ActivityQuery): T[] {
  return items.filter((row) => {
    if (q.symbol && row.symbol?.toUpperCase() !== q.symbol) return false;
    if (q.side && normalizeSide(row.side) !== q.side) return false;
    if (q.minShares && (row.shares ?? 0) < q.minShares) return false;
    if (q.minPrice && (row.price ?? 0) < q.minPrice) return false;
    if (q.maxPrice != null && (row.price ?? 0) > q.maxPrice) return false;
    if (!inDateRange(row.timestamp, q.dateFrom, q.dateTo)) return false;
    return true;
  });
}

export function filterCryptoActivity<
  T extends {
    symbol?: string;
    side?: string;
    price?: number;
    amountUsd?: number;
    timestamp?: string;
  },
>(items: T[], q: ActivityQuery): T[] {
  return items.filter((row) => {
    if (q.symbol && row.symbol?.toUpperCase() !== q.symbol.replace(/^\$/, "")) return false;
    if (q.side && normalizeSide(row.side) !== q.side) return false;
    if (q.minAmount && (row.amountUsd ?? 0) < q.minAmount) return false;
    if (q.minPrice && (row.price ?? 0) < q.minPrice) return false;
    if (q.maxPrice != null && (row.price ?? 0) > q.maxPrice) return false;
    if (!inDateRange(row.timestamp, q.dateFrom, q.dateTo)) return false;
    return true;
  });
}
