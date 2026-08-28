import { OpsDailyBrief } from "@/components/admin/ops-daily-brief";

export const metadata = {
  title: "Daily Brief — MotiveFX Ops",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <OpsDailyBrief />;
}
