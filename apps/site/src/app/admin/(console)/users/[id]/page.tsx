import { OpsUser360 } from "@/components/admin/ops-user-360";

export const metadata = {
  title: "User 360 — MotiveFX Ops",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OpsUser360 userId={id} />;
}
