import { OpsJobs } from "@/components/admin/ops-jobs";

export const metadata = {
  title: "Jobs — MotiveFX Ops",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <OpsJobs />;
}
