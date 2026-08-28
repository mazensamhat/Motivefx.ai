import { OpsStubPage } from "@/components/admin/ops-stub-page";
import { Radar } from "lucide-react";

export const metadata = { title: "Opportunity Radar — MotiveFX Ops", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <OpsStubPage
      title="Opportunity Radar"
      description="Radar quality, drift, evidence diversity, and outcomes."
      icon={Radar}
      phase="P1"
    />
  );
}
