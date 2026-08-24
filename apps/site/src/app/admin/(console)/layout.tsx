import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { OpsShell } from "@/components/admin/ops-shell";

export default async function OpsConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin/overview");
  if (!isAdminEmail(session.email)) redirect("/app");

  return <OpsShell adminEmail={session.email}>{children}</OpsShell>;
}
