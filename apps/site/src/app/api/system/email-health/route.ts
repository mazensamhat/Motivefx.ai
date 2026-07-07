import { json } from "@/lib/api";
import { fetchResendDomainStatus, getEmailConfigStatus } from "@/lib/email";
import { SHARED_RESEND_DOMAIN } from "@/lib/email-config";

export const dynamic = "force-dynamic";

export async function GET() {
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
