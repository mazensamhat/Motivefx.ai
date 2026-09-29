import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { queryRawUnsafe } = vi.hoisted(() => ({
  queryRawUnsafe: vi.fn(),
}));

vi.mock("@motivefx/database", () => ({
  prisma: {
    $queryRawUnsafe: queryRawUnsafe,
  },
}));

import HealthAuditsPage from "./page";

describe("HealthAuditsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    queryRawUnsafe.mockReset();
  });

  it("loads MotiveFX health audit runs and renders cadence counts with finding status", async () => {
    queryRawUnsafe.mockResolvedValueOnce([
      {
        id: "weekly-1",
        cadence: "weekly",
        period_start: "2026-09-21T00:00:00.000Z",
        period_end: "2026-09-28T20:30:00.000Z",
        checked_at: "2026-09-28T20:35:00.000Z",
        status: "fail",
        issue_count: 2,
        open_count: 1,
        fixed_count: 1,
        summary: "TLS and security headers need attention",
        details: [
          {
            title: "Missing HSTS",
            diagnosis: "No Strict-Transport-Security header on production",
            resolution: "Add the header at the edge",
            evidence: "curl response omitted the header",
            fixed: false,
          },
          {
            title: "Firewall verified",
            diagnosis: "Managed WAF is enabled",
            evidence: "Firewall rule active",
            fixed: true,
          },
          {
            title: "Certificate renewal watch",
            diagnosis: "Certificate expires soon",
          },
        ],
        deployment_id: "dpl_weekly",
        deployment_state: "ready",
      },
      {
        id: "daily-1",
        cadence: "daily",
        period_start: "2026-09-27T00:00:00.000Z",
        period_end: "2026-09-28T00:00:00.000Z",
        checked_at: "2026-09-28T00:10:00.000Z",
        status: "pass",
        issue_count: 0,
        open_count: 0,
        fixed_count: 0,
        summary: "No incidents detected",
        details: [],
        deployment_id: null,
        deployment_state: null,
      },
    ]);

    const html = renderToStaticMarkup(await HealthAuditsPage());

    expect(queryRawUnsafe).toHaveBeenCalledTimes(1);
    expect(queryRawUnsafe.mock.calls[0]?.[0]).toContain(
      `FROM public."OpsProductionWatchRun" WHERE product_key='motivefx' ORDER BY checked_at DESC LIMIT 250`
    );
    expect(html).toContain("Hourly (0)");
    expect(html).toContain("Daily (1)");
    expect(html).toContain("Weekly (1)");
    expect(html).toContain("Monthly (0)");
    expect(html).toContain("TLS and security headers need attention");
    expect(html).toContain("2 issues");
    expect(html).toContain("1 open");
    expect(html).toContain("Missing HSTS");
    expect(html).toContain("FAILED / OPEN");
    expect(html).toContain("PASS");
    expect(html).toContain("MONITORING");
    expect(html).toContain("No incidents in this period.");
    expect(html).toContain("No recorded hourly run yet.");
  });

  it("falls back to empty cadence sections when the audit query fails", async () => {
    const error = new Error("database unavailable");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    queryRawUnsafe.mockRejectedValueOnce(error);

    const html = renderToStaticMarkup(await HealthAuditsPage());

    expect(errorSpy).toHaveBeenCalledWith("[health-audits]", error);
    expect(html).toContain("Hourly (0)");
    expect(html).toContain("Daily (0)");
    expect(html).toContain("Weekly (0)");
    expect(html).toContain("Monthly (0)");
    expect(html).toContain("No recorded hourly run yet.");
    expect(html).toContain("No recorded daily run yet.");
    expect(html).toContain("No recorded weekly run yet.");
    expect(html).toContain("No recorded monthly run yet.");
  });
});
