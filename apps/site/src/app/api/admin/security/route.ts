import { requireAdminCapability, getAdminEmails } from "@/lib/admin";
import { forbidden, json, serverError, unauthorized } from "@/lib/api";
import { getDataMode } from "@/lib/terminal/market-truth/data-mode";
import { ledgerContaminationStats } from "@/lib/terminal/market-truth/evidence-ledger";
import { runMarketTruthGoldenChecks } from "@/lib/terminal/market-truth/golden";
import { nativeReaderSecretConfigured } from "@/lib/terminal/native-reader-token";

export async function GET() {
  const auth = await requireAdminCapability("view_security");
  if (!auth.ok) {
    if (auth.status === 401) return unauthorized(auth.error);
    return forbidden(auth.error);
  }

  try {
    const admins = getAdminEmails();
    const golden = runMarketTruthGoldenChecks();
    const contamination = ledgerContaminationStats();

    return json({
      generatedAt: new Date().toISOString(),
      dataMode: getDataMode(),
      adminEmails: {
        count: admins.length,
        configured: admins.length > 0,
        note:
          admins.length > 0
            ? `${admins.length} admin email(s) configured via ADMIN_EMAILS. Addresses are not listed for security.`
            : "No ADMIN_EMAILS configured — admin console is locked for all users.",
      },
      nativeReader: {
        secretConfigured: nativeReaderSecretConfigured(),
        tokenTtlSec: 15 * 60,
        note:
          "iOS/Android free-reader mode uses short-lived x-motivefx-native-reader JWT. User-Agent alone does not grant access.",
      },
      entitlements: {
        adminGate: "Site admin routes require session + ADMIN_EMAILS match (read-only roster here).",
        apiKeyGate:
          "Institutional API (/api/v1/*) requires Ultra+ or Elite subscription on the key owner — not UA-based.",
        nativeReaderGate:
          "APP_REVIEW feed mode resolves from signed native reader token or trusted attestation — G3/G4 boundary.",
      },
      marketTruth: {
        goldenOk: golden.ok,
        demoInSignal: contamination.demoInSignal,
        syntheticInSignal: contamination.syntheticInSignal,
      },
    });
  } catch (error) {
    console.error("[admin/security]", error);
    return serverError("Could not load security status.");
  }
}
