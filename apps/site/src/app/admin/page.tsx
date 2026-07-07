import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { isAdminEmail } from "@/lib/admin";
import { getSession } from "@/lib/session";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (!isAdminEmail(session.email)) redirect("/app");

  return <AdminDashboard adminEmail={session.email} />;
}

export const metadata = {
  title: "Ops Console — MotiveFX.AI",
  robots: { index: false, follow: false },
};
