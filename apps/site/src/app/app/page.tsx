import { prisma } from "@motivefx/database";
import { DashboardHome } from "@/components/app/dashboard-home";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Terminal — MotiveFX.AI",
};

function parseMarkets(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((m) => typeof m === "string") : [];
  } catch {
    return [];
  }
}

export default async function AppPage() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      email: true,
      intelligenceTier: true,
      selectedMarkets: true,
      stripeSubscriptionId: true,
    },
  });

  if (!user) return null;

  return (
    <DashboardHome
      email={user.email}
      tier={user.intelligenceTier}
      markets={parseMarkets(user.selectedMarkets)}
      hasSubscription={Boolean(user.stripeSubscriptionId)}
    />
  );
}
