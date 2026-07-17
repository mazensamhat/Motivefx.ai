import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";



export default async function AppLayout({ children }: { children: React.ReactNode }) {

  const session = await getSession();

  if (!session) redirect("/login?next=/app");



  return <>{children}</>;

}

