import { notFound } from "next/navigation";
import { MarketWorkspace } from "@/components/app/market-workspace";
import { getAppUser } from "@/lib/app-user";
import { syncBackendUser } from "@/lib/backend";
import { marketBySlug } from "@/lib/entitlements";

export default async function AppMarketPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const market = marketBySlug(slug);
  if (!market) notFound();

  const user = await getAppUser();
  if (!user) return null;

  const backend = await syncBackendUser(user.email);

  return (
    <MarketWorkspace
      slug={market.slug}
      label={market.label}
      description={market.description}
      marketId={market.marketId}
      tier={user.tier}
      markets={user.markets}
      hasSubscription={user.hasSubscription}
      backendUserId={backend?.userId ?? null}
      backendConnected={Boolean(backend)}
    />
  );
}
