import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { getI18n } from "@/lib/i18n/server";
import { shopDateString } from "@/lib/time";
import { SalesReportForm } from "./SalesReportForm";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.reports.title };
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ t }, { error }] = await Promise.all([getI18n(), searchParams]);
  const r = t.reports;

  return (
    <>
      <PageHeader title={r.title} subtitle={r.subtitle} />
      {error === "dates" && <p className="mb-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{r.badDates}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold">📈 {r.salesTitle}</h2>
            <p className="text-sm text-muted">{r.salesHelp}</p>
          </div>
          <SalesReportForm today={shopDateString(new Date())} />
        </section>

        <section className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold">📦 {r.stockTitle}</h2>
            <p className="text-sm text-muted">{r.stockHelp}</p>
          </div>
          <a href="/reports/stock" className="btn btn-primary" download>
            ⬇ {r.download}
          </a>
        </section>
      </div>
    </>
  );
}
