import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { excelResponse } from "@/lib/download";
import { currency, getI18n } from "@/lib/i18n/server";
import { buildSalesReport } from "@/lib/reports";
import { parseShopDate, periodRange } from "@/lib/time";

const DAY = 86_400_000;

export async function GET(request: NextRequest) {
  // Route handlers aren't covered by the page layout, so check the session here.
  if (!(await getCurrentSession())) return NextResponse.redirect(new URL("/login", request.url));

  const params = request.nextUrl.searchParams;
  const period = params.get("period") ?? "month";
  let range = periodRange(period);
  if (period === "custom") {
    const from = parseShopDate(params.get("from"));
    const lastDay = parseShopDate(params.get("to"));
    range = from && lastDay && from <= lastDay ? { from, to: new Date(lastDay.getTime() + DAY) } : null;
  }
  if (!range) return NextResponse.redirect(new URL("/reports?error=dates", request.url));

  const { t } = await getI18n();
  return excelResponse(await buildSalesReport(t, currency, range.from, range.to));
}
