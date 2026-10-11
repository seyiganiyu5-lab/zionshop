import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { excelResponse } from "@/lib/download";
import { currency, getI18n } from "@/lib/i18n/server";
import { buildStockReport } from "@/lib/reports";

export async function GET(request: NextRequest) {
  // Route handlers aren't covered by the page layout, so check the session here.
  if (!(await getCurrentSession())) return NextResponse.redirect(new URL("/login", request.url));
  const { t } = await getI18n();
  return excelResponse(await buildStockReport(t, currency));
}
