import { OPS_NAV } from "@/components/admin/ops-nav";
import { OpsStubPage } from "@/components/admin/ops-stub-page";

const item = OPS_NAV.find((n) => n.id === "users")!;

export const metadata = {
  title: `${item.label} — MotiveFX Ops`,
  robots: { index: false, follow: false },
};

export default function OpsUsersPage() {
  return <OpsStubPage item={item} />;
}
