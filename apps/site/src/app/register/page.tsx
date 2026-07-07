import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-form";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Create account — MotiveFX.AI",
};

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/app");

  return (
    <AuthPageShell
      mode="register"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[#00e676] hover:underline">
            Sign in
          </Link>
        </>
      }
    />
  );
}
