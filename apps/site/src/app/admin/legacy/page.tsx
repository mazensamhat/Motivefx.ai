import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { isAdminEmail } from "@/lib/admin";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AdminLegacyPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/legacy");
  if (!isAdminEmail(session.email)) redirect("/app");

  return <AdminDashboard adminEmail={session.email} />;
}

export const metadata = {
  title: "Classic Dashboard — MotiveFX Ops",
  robots: { index: false, follow: false },
};
