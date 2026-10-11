import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ActionForm } from "@/components/ActionForm";
import { LogoMark } from "@/components/Logo";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { productName, shopName } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { saleProfit } from "@/lib/sales";
import { voidSale } from "../actions";
import { PrintButton } from "./PrintButton";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const [sale, { t }] = await Promise.all([
    db.sale.findUnique({ where: { id: (await params).id }, select: { number: true } }),
    getI18n(),
  ]);
  return { title: sale ? t.receipt.title(sale.number) : t.sales.title };
}

export default async function SalePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const [{ id }, { new: isNew }, { t, fmt }] = await Promise.all([params, searchParams, getI18n()]);
  const r = t.receipt;
  const sale = await db.sale.findUnique({
    where: { id },
    include: { items: { include: { product: true, unit: true } } },
  });
  if (!sale) notFound();

  return (
    <>
      <div className="no-print">
        {isNew && <p className="mb-4 rounded-lg bg-success-soft p-3 text-sm text-success">{r.recorded}</p>}
        <PageHeader
          title={r.title(sale.number)}
          subtitle={r.profit(fmt.money(saleProfit(sale.items)))}
          actions={
            <>
              <Link href="/sell" className="btn btn-secondary">
                {r.newSale}
              </Link>
              <PrintButton />
            </>
          }
        />
      </div>

      <article className="card mx-auto max-w-md print:border-0 print:shadow-none">
        <header className="mb-4 flex flex-col items-center text-center">
          <LogoMark size={40} />
          <h2 className="mt-2 text-xl font-bold">{shopName}</h2>
          <p className="text-sm text-muted">{r.receiptNo(sale.number)}</p>
          <p className="text-sm text-muted">{fmt.dateTime(sale.createdAt)}</p>
        </header>
        {(sale.customerName || sale.customerPhone) && (
          <p className="mb-3 text-sm">
            {r.customer} {[sale.customerName, sale.customerPhone].filter(Boolean).join(" · ")}
          </p>
        )}
        <table className="table">
          <tbody>
            {sale.items.map((i) => (
              <tr key={i.id}>
                <td className="px-0">
                  {i.quantity > 1 && `${i.quantity} × `}
                  {productName(i.product)}
                  {i.unit && (
                    <div className="text-xs text-muted">
                      IMEI <span className="font-mono">{i.unit.imei}</span> · {t.condition[i.unit.condition]}
                    </div>
                  )}
                </td>
                <td className="px-0 text-right whitespace-nowrap">{fmt.money(i.unitPrice * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex justify-between text-lg font-bold">
          <span>{r.total}</span>
          <span>{fmt.money(sale.total)}</span>
        </div>
        <p className="mt-1 text-sm text-muted">{r.paidBy(t.payment[sale.paymentMethod])}</p>
        <p className="mt-6 text-center text-sm text-muted">{r.thanks}</p>
      </article>

      <div className="no-print mx-auto mt-6 max-w-md">
        <ActionForm action={voidSale.bind(null, sale.id)} confirm={r.cancelConfirm}>
          <button className="btn btn-danger">{r.cancel}</button>
        </ActionForm>
      </div>
    </>
  );
}
