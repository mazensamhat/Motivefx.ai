import { redirect } from "next/navigation";
import { OpsImpersonationBanner } from "@/components/admin/ops-impersonation-banner";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/app");

  return (
    <>
      <OpsImpersonationBanner />
      {children}
    </>
  );
}
