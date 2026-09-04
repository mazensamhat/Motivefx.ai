import { json, forbidden, unauthorized } from "@/lib/api";
import { requireAdminCapability } from "@/lib/admin";
import { fetchResendDomainStatus, getEmailConfigStatus } from "@/lib/email";
import { SHARED_RESEND_DOMAIN } from "@/lib/email-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminCapability("view_security");
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  const status = getEmailConfigStatus();
  const domain = await fetchResendDomainStatus(SHARED_RESEND_DOMAIN);
  const domainVerified = domain?.exists && domain.status === "verified";

  return json(
    {
      ok: status.configured && domainVerified,
      email: status,
      domain,
      hint:
        status.configured && domainVerified
          ? null
          : "Copy RESEND_API_KEY from Motive Life Vercel and set EMAIL_FROM on MotiveFX.",
    },
    status.keyConfigured ? 200 : 503
  );
}
