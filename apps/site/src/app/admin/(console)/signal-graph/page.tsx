import { OpsSignalGraph } from "@/components/admin/ops-signal-graph";

export const metadata = {
  title: "Signal Graph — MotiveFX Ops",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <OpsSignalGraph />;
}
