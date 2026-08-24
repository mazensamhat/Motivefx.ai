import { OPS_NAV } from "@/components/admin/ops-nav";
import { OpsStubPage } from "@/components/admin/ops-stub-page";

const item = OPS_NAV.find((n) => n.id === "product")!;

export const metadata = {
  title: `${item.label} — MotiveFX Ops`,
  robots: { index: false, follow: false },
};

export default function OpsProductPage() {
  return <OpsStubPage item={item} />;
}
