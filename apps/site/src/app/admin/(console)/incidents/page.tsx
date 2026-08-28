import { OpsIncidents } from "@/components/admin/ops-incidents";

export const metadata = {
  title: "Incidents — MotiveFX Ops",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <OpsIncidents />;
}
