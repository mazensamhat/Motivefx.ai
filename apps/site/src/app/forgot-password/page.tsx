import { BrandLogo } from "@/components/brand/logo";
import { ForgotPasswordForm } from "@/components/auth/password-reset-forms";

export const metadata = {
  title: "Forgot password — MotiveFX.AI",
};

export default function ForgotPasswordPage() {
  return (
    <div className="auth-page flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <BrandLogo />
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
