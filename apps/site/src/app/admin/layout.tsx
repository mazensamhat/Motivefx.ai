import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import { getSession } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (!isAdminEmail(session.email)) redirect("/app");

  return <div className="min-h-screen">{children}</div>;
}
