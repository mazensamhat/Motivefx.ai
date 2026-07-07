import { DashboardHome } from "@/components/app/dashboard-home";
import { getAppUser } from "@/lib/app-user";
import { fetchBackendJson, syncBackendUser } from "@/lib/backend";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Terminal — MotiveFX.AI",
};

export default async function AppPage() {
  const user = await getAppUser();
  if (!user) redirect("/login?next=/app");

  const backend = await syncBackendUser(user.email);
  let briefing: Record<string, unknown> | null = null;
  if (backend) {
    briefing = await fetchBackendJson<Record<string, unknown>>(
      `/api/home/briefing?user_id=${encodeURIComponent(backend.userId)}`,
      backend
    );
  }

  return (
    <DashboardHome
      email={user.email}
      tier={user.tier}
      markets={user.markets}
      hasSubscription={user.hasSubscription}
      briefing={briefing}
      backendConnected={Boolean(backend)}
    />
  );
}
