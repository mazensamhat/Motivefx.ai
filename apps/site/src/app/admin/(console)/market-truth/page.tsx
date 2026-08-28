import { Suspense } from "react";
import { OpsMarketTruth } from "@/components/admin/ops-market-truth";

export const metadata = {
  title: "Market Truth — MotiveFX Ops",
  robots: { index: false, follow: false },
};

export default function OpsMarketTruthPage() {
  return (
    <Suspense fallback={<p className="ops-muted">Loading market truth…</p>}>
      <OpsMarketTruth />
    </Suspense>
  );
}
