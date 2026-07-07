import { redirect } from "next/navigation";
import { AccountSettings } from "@/components/app/account-settings";
import { getAppUser } from "@/lib/app-user";

export const metadata = {
  title: "Account — MotiveFX.AI",
};

export default async function SettingsPage() {
  const user = await getAppUser();
  if (!user) redirect("/login?next=/app/settings");

  return (
    <AccountSettings
      email={user.email}
      tier={user.tier}
      markets={user.markets}
      hasSubscription={user.hasSubscription}
      hasBillingAccount={user.hasBillingAccount}
    />
  );
}
