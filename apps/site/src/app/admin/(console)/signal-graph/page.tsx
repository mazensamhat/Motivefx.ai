import { OpsStubPage } from "@/components/admin/ops-stub-page";
import { Network } from "lucide-react";

export const metadata = { title: "Signal Graph — MotiveFX Ops", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <OpsStubPage
      title="Signal Graph"
      description="Relationship evidence, confidence, and stale cascade detection."
      icon={Network}
      phase="P2"
    />
  );
}
