import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/PageHeader";
import { ProductFields } from "@/components/ProductFields";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { productName } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import {
  addUnits,
  deleteProduct,
  deleteUnit,
  receiveAccessories,
  setAccessoryQuantity,
  updateProduct,
} from "../actions";

async function getProduct(id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      units: {
        orderBy: [{ status: "asc" }, { addedAt: "desc" }],
        include: { saleItem: { select: { unitPrice: true, sale: { select: { id: true, number: true, createdAt: true } } } } },
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const product = await getProduct((await params).id);
  return { title: product ? productName(product) : "Zionshop" };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, { t, fmt }] = await Promise.all([getProduct(id), getI18n()]);
  if (!product) notFound();
  const p = t.product;
  const optional = (label: string) => `${label} (${t.common.optional})`;

  const isPhone = product.category === "PHONE";
  const inStock = product.units.filter((u) => u.status === "IN_STOCK");
  const onHand = isPhone ? inStock.length : product.quantity;

  return (
    <>
      <PageHeader
        title={productName(product)}
        subtitle={p.subtitle(isPhone ? t.common.phone : t.common.accessory, onHand, fmt.money(product.sellPrice))}
        actions={
          <Link href="/products" className="btn btn-secondary">
            {p.backToStock}
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {isPhone ? (
            <section className="card">
              <h2 className="mb-3 font-semibold">{p.phones(inStock.length)}</h2>
              {product.units.length === 0 ? (
                <p className="text-sm text-muted">{p.noPhones}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{p.imei}</th>
                        <th>{p.condition}</th>
                        <th className="text-right">{p.cost}</th>
                        <th>{p.status}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.units.map((u) => (
                        <tr key={u.id}>
                          <td className="font-mono">
                            {u.imei}
                            {(u.supplier || u.notes) && (
                              <div className="font-sans text-xs text-muted">
                                {[u.supplier && p.from(u.supplier), u.notes].filter(Boolean).join(" · ")}
                              </div>
                            )}
                          </td>
                          <td>{t.condition[u.condition]}</td>
                          <td className="text-right">{fmt.money(u.costPrice)}</td>
                          <td>
                            {u.saleItem ? (
                              <Link href={`/sales/${u.saleItem.sale.id}`} className="link text-sm">
                                {p.soldFor(u.saleItem.sale.number, fmt.money(u.saleItem.unitPrice))}
                                <div className="text-xs text-muted">{fmt.dateTime(u.saleItem.sale.createdAt)}</div>
                              </Link>
                            ) : (
                              <span className="badge badge-success">{t.common.inStock}</span>
                            )}
                          </td>
                          <td className="text-right">
                            {u.status === "IN_STOCK" && (
                              <ActionForm action={deleteUnit.bind(null, u.id)} confirm={p.removeConfirm(u.imei)}>
                                <button className="text-xs text-danger hover:underline">{t.common.remove}</button>
                              </ActionForm>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : (
            <section className="card">
              <h2 className="mb-1 font-semibold">{p.stockHeading}</h2>
              <p className="mb-4 text-sm text-muted">{p.accessorySummary(product.quantity, fmt.money(product.costPrice))}</p>
              <ActionForm action={setAccessoryQuantity.bind(null, product.id)} className="flex flex-wrap items-end gap-2">
                <label className="min-w-48 flex-1">
                  <span className="label">{p.correctCount}</span>
                  <input name="quantity" type="number" min={0} step={1} defaultValue={product.quantity} className="input" />
                </label>
                <SubmitButton className="btn btn-secondary">{p.updateCount}</SubmitButton>
              </ActionForm>
            </section>
          )}

          <section className="card">
            <h2 className="mb-3 font-semibold">{p.details}</h2>
            <ActionForm action={updateProduct.bind(null, product.id)} className="space-y-4">
              <ProductFields t={t} product={product} />
              <SubmitButton>{t.common.save}</SubmitButton>
            </ActionForm>
          </section>

          <ActionForm action={deleteProduct.bind(null, product.id)} confirm={p.deleteConfirm}>
            <button className="btn btn-danger">{p.deleteProduct}</button>
          </ActionForm>
        </div>

        <aside>
          {isPhone ? (
            <ActionForm action={addUnits.bind(null, product.id)} resetOnSuccess className="card space-y-4 lg:sticky lg:top-4">
              <h2 className="font-semibold">{p.addPhones}</h2>
              <label className="block">
                <span className="label">{p.imeiList}</span>
                <textarea name="imeis" rows={4} required placeholder={p.imeiPlaceholder} className="input font-mono" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="label">{p.condition}</span>
                  <select name="condition" className="input" defaultValue="NEW">
                    <option value="NEW">{t.condition.NEW}</option>
                    <option value="USED">{t.condition.USED}</option>
                    <option value="REFURBISHED">{t.condition.REFURBISHED}</option>
                  </select>
                </label>
                <label>
                  <span className="label">{p.costEach}</span>
                  <input name="costPrice" type="number" min={0} step={1} required className="input" />
                </label>
              </div>
              <label className="block">
                <span className="label">{optional(p.supplier)}</span>
                <input name="supplier" maxLength={100} className="input" />
              </label>
              <label className="block">
                <span className="label">{optional(p.notes)}</span>
                <input name="notes" maxLength={300} placeholder={p.notesPlaceholder} className="input" />
              </label>
              <SubmitButton>{p.addToStock}</SubmitButton>
            </ActionForm>
          ) : (
            <ActionForm action={receiveAccessories.bind(null, product.id)} resetOnSuccess className="card space-y-4 lg:sticky lg:top-4">
              <h2 className="font-semibold">{p.receiveStock}</h2>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="label">{p.quantity}</span>
                  <input name="quantity" type="number" min={1} step={1} required className="input" />
                </label>
                <label>
                  <span className="label">{p.costEach}</span>
                  <input name="costPrice" type="number" min={0} step={1} required className="input" />
                </label>
              </div>
              <SubmitButton>{p.addToStock}</SubmitButton>
            </ActionForm>
          )}
        </aside>
      </div>
    </>
  );
}
