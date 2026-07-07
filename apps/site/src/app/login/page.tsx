import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-form";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Sign in — MotiveFX.AI",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/app");

  return (
    <AuthPageShell
      mode="login"
      footer={
        <>
          No account?{" "}
          <Link href="/register" className="font-medium text-[#00e676] hover:underline">
            Create one
          </Link>
        </>
      }
    />
  );
}
