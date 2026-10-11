import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { productName } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { saleProfit } from "@/lib/sales";
import { getStockRows } from "@/lib/stock";
import { startOfShopDay } from "@/lib/time";

export default async function DashboardPage() {
  const [{ user }, { t, fmt }] = await Promise.all([requireUser(), getI18n()]);
  const d = t.dashboard;
  const today = startOfShopDay();
  const monthAgo = new Date(today.getTime() - 29 * 86_400_000);
  const itemFields = { quantity: true, unitPrice: true, costPrice: true } as const;

  const [stock, todayItems, todaySales, monthItems, recent] = await Promise.all([
    getStockRows(),
    db.saleItem.findMany({ where: { sale: { createdAt: { gte: today } } }, select: itemFields }),
    db.sale.count({ where: { createdAt: { gte: today } } }),
    db.saleItem.findMany({ where: { sale: { createdAt: { gte: monthAgo } } }, select: itemFields }),
    db.sale.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { items: { include: { product: true } } } }),
  ]);

  const revenue = (items: typeof todayItems) => items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const phonesInStock = stock.filter((s) => s.category === "PHONE").reduce((s, r) => s + r.onHand, 0);
  const stockCost = stock.reduce((s, r) => s + r.stockCost, 0);
  const low = stock.filter((s) => s.isLow);

  return (
    <>
      <PageHeader
        title={d.title}
        actions={
          <>
            <Link href="/products/new" className="btn btn-secondary">
              {d.product}
            </Link>
            <Link href="/sell" className="btn btn-primary">
              {t.common.newSale}
            </Link>
          </>
        }
      />

      {!user.totpEnabled && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4">
          <div>
            <p className="font-semibold text-warning">{d.secureTitle}</p>
            <p className="text-sm text-fg-2">{d.secureBody}</p>
          </div>
          <Link href="/settings" className="btn btn-primary">
            {d.secureAction}
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={d.todaySales} value={fmt.money(revenue(todayItems))} note={d.salesCount(todaySales)} />
        <Stat label={d.todayProfit} value={fmt.money(saleProfit(todayItems))} />
        <Stat label={d.last30} value={fmt.money(revenue(monthItems))} note={d.profitNote(fmt.money(saleProfit(monthItems)))} />
        <Stat label={d.phonesInStock} value={String(phonesInStock)} note={d.stockCostNote(fmt.money(stockCost))} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{d.runningLow}</h2>
            <Link href="/products?show=low" className="link text-sm">
              {t.common.seeAll}
            </Link>
          </div>
          {low.length === 0 ? (
            <p className="text-sm text-muted">{d.nothingLow}</p>
          ) : (
            <ul className="divide-y divide-line">
              {low.slice(0, 8).map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-2 text-sm">
                  <Link href={`/products/${p.id}`} className="hover:underline">
                    {productName(p)}
                  </Link>
                  <span className={`font-semibold whitespace-nowrap ${p.onHand === 0 ? "text-danger" : "text-warning"}`}>
                    {p.onHand === 0 ? d.outOfStock : d.left(p.onHand)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{d.recentSales}</h2>
            <Link href="/sales" className="link text-sm">
              {t.common.seeAll}
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">
              {d.noSales}{" "}
              <Link href="/sell" className="link">
                {d.recordOne}
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((s) => (
                <li key={s.id} className="py-2 text-sm">
                  <Link href={`/sales/${s.id}`} className="flex justify-between gap-3 hover:underline">
                    <span className="min-w-0 truncate">
                      #{s.number} · {s.items.map((i) => productName(i.product)).join(", ")}
                    </span>
                    <span className="font-medium whitespace-nowrap">{fmt.money(s.total)}</span>
                  </Link>
                  <div className="text-xs text-muted">{fmt.dateTime(s.createdAt)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card">
      <div className="text-sm text-muted">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {note && <div className="text-xs text-muted">{note}</div>}
    </div>
  );
}
