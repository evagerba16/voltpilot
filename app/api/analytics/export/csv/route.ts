import { NextResponse } from "next/server";

import { assertApiPermission } from "@/lib/auth/get-team-context";
import { apiErrorStatus } from "@/lib/auth/permission-errors";
import { analyticsToCsv } from "@/lib/analytics/export-csv";
import { getAnalyticsData } from "@/lib/analytics/queries";
import { parseAnalyticsFilters } from "@/lib/analytics/url";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const context = await assertApiPermission("analytics.view");
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`analytics-export-csv:${context.userId}:${ip}`, {
      max: 10,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterMs);
    }

    const { searchParams } = new URL(request.url);
    const parsed = parseAnalyticsFilters({
      range: searchParams.get("range") ?? undefined,
      customer: searchParams.get("customer") ?? undefined,
      project: searchParams.get("project") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const data = await getAnalyticsData({
      dateRange: parsed.dateRange,
      customerId: parsed.customerId,
      projectId: parsed.projectId,
      projectStatus: parsed.projectStatus,
    });

    const csv = analyticsToCsv(data);
    const filename = `voltpilot-analytics-${parsed.dateRange}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to export analytics CSV.";
    return NextResponse.json(
      { error: message },
      { status: apiErrorStatus(error) }
    );
  }
}
