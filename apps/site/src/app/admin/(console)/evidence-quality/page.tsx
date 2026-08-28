import { OpsStubPage } from "@/components/admin/ops-stub-page";
import { GitBranch } from "lucide-react";

export const metadata = { title: "Evidence Quality — MotiveFX Ops", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <OpsStubPage
      title="Evidence Quality"
      description="Supporting / counter / neutral stacks, independence, and contradictions."
      icon={GitBranch}
      phase="P1"
    />
  );
}
