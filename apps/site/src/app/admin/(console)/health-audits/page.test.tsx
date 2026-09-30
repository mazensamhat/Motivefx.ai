import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { queryRawUnsafe } = vi.hoisted(() => ({
  queryRawUnsafe: vi.fn<(query: string) => Promise<unknown[]>>(),
}));

vi.mock("@motivefx/database", () => ({
  prisma: {
    $queryRawUnsafe: queryRawUnsafe,
  },
}));

import HealthAuditsPage from "./page";

async function renderPageText() {
  const html = renderToStaticMarkup(await HealthAuditsPage());

  return {
    html,
    text: html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim(),
  };
}

describe("HealthAuditsPage", () => {
  beforeEach(() => {
    queryRawUnsafe.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads MotiveFX audit runs with the expected scope and renders cadence findings", async () => {
    queryRawUnsafe.mockResolvedValueOnce([
      {
        id: "hourly-open",
        cadence: "hourly",
        period_start: "2026-09-30T07:00:00.000Z",
        period_end: "2026-09-30T08:00:00.000Z",
        checked_at: "2026-09-30T08:01:00.000Z",
        status: "FAILED",
        issue_count: 2,
        open_count: 1,
        fixed_count: 1,
        summary: "Payment checks need operator review",
        details: [
          {
            title: "Stripe webhook latency",
            diagnosis: "Webhook retries exceeded threshold",
            resolution: "Escalate provider incident",
            evidence: "last retry at 08:00",
            fixed: false,
          },
          {
            title: "Session cookie rotation",
            diagnosis: "Fresh login probe passed",
            resolution: "No action required",
            evidence: "probe green",
            fixed: true,
          },
          {
            title: "RevenueCat sync watch",
            diagnosis: "Sync lag is below page threshold",
            resolution: "Continue monitoring",
            evidence: "lag trending down",
          },
        ],
        deployment_id: "deploy-1",
        deployment_state: "live",
      },
      {
        id: "hourly-pass",
        cadence: "hourly",
        period_start: "2026-09-30T06:00:00.000Z",
        period_end: "2026-09-30T07:00:00.000Z",
        checked_at: "2026-09-30T07:01:00.000Z",
        status: "PASSED",
        issue_count: 0,
        open_count: 0,
        fixed_count: 0,
        summary: "All probes healthy",
        details: null,
        deployment_id: null,
        deployment_state: null,
      },
      {
        id: "daily-pass",
        cadence: "daily",
        period_start: "2026-09-29T00:00:00.000Z",
        period_end: "2026-09-30T00:00:00.000Z",
        checked_at: "2026-09-30T00:05:00.000Z",
        status: "PASSED",
        issue_count: 0,
        open_count: 0,
        fixed_count: 0,
        summary: "Daily checks complete",
        details: [],
        deployment_id: null,
        deployment_state: null,
      },
    ]);

    const { text } = await renderPageText();

    expect(queryRawUnsafe).toHaveBeenCalledTimes(1);
    const sql = queryRawUnsafe.mock.calls[0][0];
    expect(sql).toContain('FROM public."OpsProductionWatchRun"');
    expect(sql).toContain("WHERE product_key='motivefx'");
    expect(sql).toContain("ORDER BY checked_at DESC LIMIT 250");

    expect(text).toContain("Production Health & Security");
    expect(text).toContain("Hourly (2)");
    expect(text).toContain("Daily (1)");
    expect(text).toContain("Weekly (0)");
    expect(text).toContain("Monthly (0)");
    expect(text).toContain("Payment checks need operator review");
    expect(text).toContain("Stripe webhook latency");
    expect(text).toContain("FAILED / OPEN");
    expect(text).toContain("Session cookie rotation");
    expect(text).toContain("PASS");
    expect(text).toContain("RevenueCat sync watch");
    expect(text).toContain("MONITORING");
    expect(text).toContain("All probes healthy");
    expect(text).toContain("No incidents in this period.");
    expect(text).toContain("No recorded weekly run yet.");
  });

  it("falls back to empty cadence sections when the audit query fails", async () => {
    const error = new Error("database unavailable");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    queryRawUnsafe.mockRejectedValueOnce(error);

    const { text } = await renderPageText();

    expect(errorSpy).toHaveBeenCalledWith("[health-audits]", error);
    expect(text).toContain("Hourly (0)");
    expect(text).toContain("Daily (0)");
    expect(text).toContain("Weekly (0)");
    expect(text).toContain("Monthly (0)");
    expect(text).toContain("No recorded hourly run yet.");
    expect(text).toContain("No recorded monthly run yet.");
  });
});
