import { OpsStubPage } from "@/components/admin/ops-stub-page";
import { Activity } from "lucide-react";

export const metadata = { title: "Live Operations — MotiveFX Ops", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <OpsStubPage
      title="Live Operations"
      description="Real-time event feed across signals, providers, users, and AI."
      icon={Activity}
      phase="P1"
    />
  );
}
