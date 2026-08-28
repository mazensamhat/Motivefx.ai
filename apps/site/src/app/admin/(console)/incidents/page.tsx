import { OpsStubPage } from "@/components/admin/ops-stub-page";
import { AlertTriangle } from "lucide-react";

export const metadata = { title: "Alerts & Incidents — MotiveFX Ops", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <OpsStubPage
      title="Alerts & Incidents"
      description="Incident desk with severity, correlation, and runbooks."
      icon={AlertTriangle}
      phase="P1"
    />
  );
}
