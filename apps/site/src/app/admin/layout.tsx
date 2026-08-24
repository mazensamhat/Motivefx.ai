import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import { getSession } from "@/lib/session";

/** Auth gate for all /admin routes. Console shell lives in (console)/layout. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/overview");
  if (!isAdminEmail(session.email)) redirect("/app");

  return <div className="min-h-screen">{children}</div>;
}
