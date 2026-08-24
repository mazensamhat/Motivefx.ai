import { OpsUsers } from "@/components/admin/ops-users";

export const metadata = {
  title: "Users — MotiveFX Ops",
  robots: { index: false, follow: false },
};

export default function OpsUsersPage() {
  return <OpsUsers />;
}
