import { OpsStubPage } from "@/components/admin/ops-stub-page";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Audit Log — MotiveFX Ops", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <OpsStubPage
      title="Audit Log"
      description="WHO / WHAT / TARGET / WHEN / WHY / BEFORE / AFTER for sensitive ops actions."
      icon={ShieldCheck}
      phase="P1"
    />
  );
}
