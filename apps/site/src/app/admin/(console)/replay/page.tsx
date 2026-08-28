import { OpsHistoricalReplay } from "@/components/admin/ops-historical-replay";

export const metadata = {
  title: "Historical Replay — MotiveFX Ops",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <OpsHistoricalReplay />;
}
