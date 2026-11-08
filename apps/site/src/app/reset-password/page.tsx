import { BrandLogo } from "@/components/brand/logo";
import { ResetPasswordForm } from "@/components/auth/password-reset-forms";
import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata("Reset password — MotiveFX.AI");

export default function ResetPasswordPage() {
  return (
    <div className="auth-page flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <BrandLogo />
      </div>
      <ResetPasswordForm />
    </div>
  );
}
