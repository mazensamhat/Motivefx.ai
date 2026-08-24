import { OpsReleases } from "@/components/admin/ops-releases";

export const metadata = {
  title: "Releases — MotiveFX Ops",
  robots: { index: false, follow: false },
};

export default function OpsReleasesPage() {
  return <OpsReleases />;
}
