import { OpsStubPage } from "@/components/admin/ops-stub-page";
import { Dna } from "lucide-react";

export const metadata = { title: "Market DNA — MotiveFX Ops", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <OpsStubPage
      title="Market DNA"
      description="Asset personality profiles, regime shifts, and DNA drift."
      icon={Dna}
      phase="P2"
    />
  );
}
