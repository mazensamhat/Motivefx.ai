import { DashboardHome } from "@/components/app/dashboard-home";
import { getAppUser } from "@/lib/app-user";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Terminal — MotiveFX.AI",
};

export default async function AppPage() {
  const user = await getAppUser();
  if (!user) redirect("/login?next=/app");

  return (
    <DashboardHome
      email={user.email}
      tier={user.tier}
      markets={user.markets}
      hasSubscription={user.hasSubscription}
    />
  );
}
