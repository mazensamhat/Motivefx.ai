import { OpsAuditLog } from "@/components/admin/ops-audit-log";

export const metadata = {
  title: "Audit Log — MotiveFX Ops",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <OpsAuditLog />;
}
