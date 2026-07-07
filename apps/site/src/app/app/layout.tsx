import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/app");

  return <AppShell email={session.email}>{children}</AppShell>;
}
