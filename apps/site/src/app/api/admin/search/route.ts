import { requireAdmin } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getRecentLedgerEntries } from "@/lib/terminal/market-truth/evidence-ledger";
import { prisma } from "@motivefx/database";

export type OpsSearchHit = {
  id: string;
  kind: "nav" | "user" | "symbol" | "provider" | "signal";
  title: string;
  subtitle?: string;
  href: string;
};

const STATIC_PROVIDERS = [
  { id: "finnhub", title: "Finnhub", href: "/admin/providers" },
  { id: "coinstats", title: "CoinStats", href: "/admin/providers" },
  { id: "polymarket", title: "Polymarket", href: "/admin/providers" },
  { id: "odds", title: "The Odds API", href: "/admin/providers" },
  { id: "openai", title: "OpenAI", href: "/admin/ai-costs" },
  { id: "stripe", title: "Stripe", href: "/admin/revenue" },
  { id: "vercel", title: "Vercel", href: "/admin/overview" },
  { id: "supabase", title: "Supabase", href: "/admin/overview" },
];

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    if (!q || q.length < 1) {
      return json({ query: q, hits: [] as OpsSearchHit[] });
    }

    const hits: OpsSearchHit[] = [];

    for (const p of STATIC_PROVIDERS) {
      if (p.title.toLowerCase().includes(q) || p.id.includes(q)) {
        hits.push({
          id: `provider-${p.id}`,
          kind: "provider",
          title: p.title,
          subtitle: "Provider",
          href: p.href,
        });
      }
    }

    for (const entry of getRecentLedgerEntries(100)) {
      if (entry.symbol.toLowerCase().includes(q)) {
        const existing = hits.find((h) => h.kind === "symbol" && h.title === entry.symbol);
        if (!existing) {
          hits.push({
            id: `symbol-${entry.symbol}`,
            kind: "symbol",
            title: entry.symbol,
            subtitle: `Motive Signal ${entry.motiveSignal ?? "—"} · ledger`,
            href: `/admin/market-truth?symbol=${encodeURIComponent(entry.symbol)}`,
          });
        }
        if (hits.filter((h) => h.kind === "symbol").length >= 8) break;
      }
    }

    try {
      const users = await prisma.user.findMany({
        where: {
          OR: [{ email: { contains: q } }, { id: { contains: q } }],
        },
        select: {
          id: true,
          email: true,
          intelligenceTier: true,
          subscriptionStatus: true,
        },
        take: 8,
        orderBy: { createdAt: "desc" },
      });
      for (const u of users) {
        hits.push({
          id: `user-${u.id}`,
          kind: "user",
          title: u.email,
          subtitle: `${u.intelligenceTier ?? "free"} · ${u.subscriptionStatus ?? "none"}`,
          href: `/admin/users?q=${encodeURIComponent(u.email)}`,
        });
      }
    } catch (e) {
      console.warn("[admin/search] user query skipped", e);
    }

    return json({ query: q, hits: hits.slice(0, 24) });
  } catch (error) {
    console.error("[admin/search]", error);
    return serverError("Search failed.");
  }
}
