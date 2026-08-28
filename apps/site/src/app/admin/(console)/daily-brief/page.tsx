import { OpsStubPage } from "@/components/admin/ops-stub-page";
import { ScrollText } from "lucide-react";

export const metadata = { title: "Daily Brief — MotiveFX Ops", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <OpsStubPage
      title="Daily Brief"
      description="Brief generation, validation, publishing, and quality checks."
      icon={ScrollText}
      phase="P2"
    />
  );
}
