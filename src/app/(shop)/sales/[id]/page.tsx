import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/PageHeader";
import { db } from "@/lib/db";
import { conditionLabel, formatDateTime, formatMoney, paymentLabel, productName, shopName } from "@/lib/format";
import { saleProfit } from "@/lib/sales";
import { voidSale } from "../actions";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const sale = await db.sale.findUnique({ where: { id: (await params).id }, select: { number: true } });
  return { title: sale ? `Sale #${sale.number}` : "Sale" };
}

export default async function SalePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const [{ id }, { new: isNew }] = await Promise.all([params, searchParams]);
  const sale = await db.sale.findUnique({
    where: { id },
    include: { items: { include: { product: true, unit: true } } },
  });
  if (!sale) notFound();

  return (
    <>
      <div className="no-print">
        {isNew && <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">Sale recorded.</p>}
        <PageHeader
          title={`Sale #${sale.number}`}
          subtitle={`Profit ${formatMoney(saleProfit(sale.items))}`}
          actions={
            <>
              <Link href="/sell" className="btn btn-secondary">
                New sale
              </Link>
              <PrintButton />
            </>
          }
        />
      </div>

      <article className="card mx-auto max-w-md print:border-0 print:shadow-none">
        <header className="mb-4 text-center">
          <h2 className="text-xl font-bold">{shopName}</h2>
          <p className="text-sm text-muted">Receipt #{sale.number}</p>
          <p className="text-sm text-muted">{formatDateTime(sale.createdAt)}</p>
        </header>
        {(sale.customerName || sale.customerPhone) && (
          <p className="mb-3 text-sm">
            Customer: {[sale.customerName, sale.customerPhone].filter(Boolean).join(" · ")}
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
                      IMEI <span className="font-mono">{i.unit.imei}</span> · {conditionLabel[i.unit.condition]}
                    </div>
                  )}
                </td>
                <td className="px-0 text-right whitespace-nowrap">{formatMoney(i.unitPrice * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatMoney(sale.total)}</span>
        </div>
        <p className="mt-1 text-sm text-muted">Paid by {paymentLabel[sale.paymentMethod].toLowerCase()}</p>
        <p className="mt-6 text-center text-sm text-muted">Thank you for shopping with us!</p>
      </article>

      <div className="no-print mx-auto mt-6 max-w-md">
        <ActionForm
          action={voidSale.bind(null, sale.id)}
          confirm="Cancel this sale? The items will go back into stock and the sale will be deleted."
        >
          <button className="btn btn-danger">Cancel sale / refund</button>
        </ActionForm>
      </div>
    </>
  );
}
