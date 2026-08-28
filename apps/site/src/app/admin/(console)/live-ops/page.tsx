import { OpsLiveOperations } from "@/components/admin/ops-live-operations";

export const metadata = {
  title: "Live Operations — MotiveFX Ops",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <OpsLiveOperations />;
}
