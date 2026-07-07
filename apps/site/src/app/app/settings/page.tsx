import { redirect } from "next/navigation";
import { AccountSettings } from "@/components/app/account-settings";
import { AppShell } from "@/components/app/app-shell";
import { getAppUser } from "@/lib/app-user";
import { isAdminEmail } from "@/lib/admin";

export const metadata = {
  title: "Account — MotiveFX.AI",
};

export default async function SettingsPage() {
  const user = await getAppUser();
  if (!user) redirect("/login?next=/app/settings");

  return (
    <AppShell email={user.email} isAdmin={isAdminEmail(user.email)}>
      <AccountSettings
        email={user.email}
        tier={user.tier}
        markets={user.markets}
        hasSubscription={user.hasSubscription}
        hasBillingAccount={user.hasBillingAccount}
      />
    </AppShell>
  );
}
