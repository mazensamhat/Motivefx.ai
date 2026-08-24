import { getSession } from "@/lib/session";
import { OpsOverview } from "@/components/admin/ops-overview";

export const metadata = {
  title: "Overview — MotiveFX Ops",
  robots: { index: false, follow: false },
};

export default async function OpsOverviewPage() {
  const session = await getSession();
  return <OpsOverview adminEmail={session?.email} />;
}
