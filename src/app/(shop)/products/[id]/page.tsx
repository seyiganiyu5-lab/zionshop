import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/PageHeader";
import { ProductFields } from "@/components/ProductFields";
import { SubmitButton } from "@/components/SubmitButton";
import { db } from "@/lib/db";
import { conditionLabel, formatDateTime, formatMoney, productName } from "@/lib/format";
import {
  addUnits,
  deleteProduct,
  deleteUnit,
  receiveAccessories,
  setAccessoryQuantity,
  updateProduct,
} from "../actions";

export const dynamic = "force-dynamic";

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
  return { title: product ? productName(product) : "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const isPhone = product.category === "PHONE";
  const inStock = product.units.filter((u) => u.status === "IN_STOCK");
  const onHand = isPhone ? inStock.length : product.quantity;

  return (
    <>
      <PageHeader
        title={productName(product)}
        subtitle={
          <>
            {isPhone ? "Phone" : "Accessory"} · {onHand} on hand · sells for {formatMoney(product.sellPrice)}
          </>
        }
        actions={
          <Link href="/products" className="btn btn-secondary">
            ← Back to stock
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {isPhone ? (
            <section className="card">
              <h2 className="mb-3 font-semibold">Phones ({inStock.length} in stock)</h2>
              {product.units.length === 0 ? (
                <p className="text-sm text-muted">No phones added yet. Use the form to add them by IMEI.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>IMEI</th>
                        <th>Condition</th>
                        <th className="text-right">Cost</th>
                        <th>Status</th>
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
                                {[u.supplier && `From ${u.supplier}`, u.notes].filter(Boolean).join(" · ")}
                              </div>
                            )}
                          </td>
                          <td>{conditionLabel[u.condition]}</td>
                          <td className="text-right">{formatMoney(u.costPrice)}</td>
                          <td>
                            {u.saleItem ? (
                              <Link href={`/sales/${u.saleItem.sale.id}`} className="text-sm text-brand hover:underline">
                                Sold #{u.saleItem.sale.number} for {formatMoney(u.saleItem.unitPrice)}
                                <div className="text-xs text-muted">{formatDateTime(u.saleItem.sale.createdAt)}</div>
                              </Link>
                            ) : (
                              <span className="badge bg-green-100 text-green-800">In stock</span>
                            )}
                          </td>
                          <td className="text-right">
                            {u.status === "IN_STOCK" && (
                              <ActionForm action={deleteUnit.bind(null, u.id)} confirm={`Remove IMEI ${u.imei}?`}>
                                <button className="text-xs text-danger hover:underline">Remove</button>
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
              <h2 className="mb-1 font-semibold">Stock</h2>
              <p className="mb-4 text-sm text-muted">
                {product.quantity} on hand · average cost {formatMoney(product.costPrice)} each
              </p>
              <ActionForm action={setAccessoryQuantity.bind(null, product.id)} className="flex items-end gap-2">
                <label className="flex-1">
                  <span className="label">Correct the count (after a stock take, damage or loss)</span>
                  <input name="quantity" type="number" min={0} step={1} defaultValue={product.quantity} className="input" />
                </label>
                <SubmitButton className="btn btn-secondary">Update count</SubmitButton>
              </ActionForm>
            </section>
          )}

          <section className="card">
            <h2 className="mb-3 font-semibold">Details</h2>
            <ActionForm action={updateProduct.bind(null, product.id)} className="space-y-4">
              <ProductFields product={product} />
              <SubmitButton>Save changes</SubmitButton>
            </ActionForm>
          </section>

          <ActionForm action={deleteProduct.bind(null, product.id)} confirm="Delete this product?">
            <button className="btn btn-danger">Delete product</button>
          </ActionForm>
        </div>

        <aside>
          {isPhone ? (
            <ActionForm action={addUnits.bind(null, product.id)} resetOnSuccess className="card space-y-4 lg:sticky lg:top-4">
              <h2 className="font-semibold">Add phones</h2>
              <label className="block">
                <span className="label">IMEI numbers (one per line)</span>
                <textarea
                  name="imeis"
                  rows={4}
                  required
                  placeholder={"Scan or type, one per line.\nDial *#06# on the phone to see it."}
                  className="input font-mono"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="label">Condition</span>
                  <select name="condition" className="input" defaultValue="NEW">
                    <option value="NEW">New</option>
                    <option value="USED">Used</option>
                    <option value="REFURBISHED">Refurbished</option>
                  </select>
                </label>
                <label>
                  <span className="label">Cost each</span>
                  <input name="costPrice" type="number" min={0} step={1} required className="input" />
                </label>
              </div>
              <label className="block">
                <span className="label">Supplier (optional)</span>
                <input name="supplier" className="input" />
              </label>
              <label className="block">
                <span className="label">Notes (optional)</span>
                <input name="notes" placeholder="e.g. small scratch on back" className="input" />
              </label>
              <SubmitButton>Add to stock</SubmitButton>
            </ActionForm>
          ) : (
            <ActionForm action={receiveAccessories.bind(null, product.id)} resetOnSuccess className="card space-y-4 lg:sticky lg:top-4">
              <h2 className="font-semibold">Receive stock</h2>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="label">Quantity</span>
                  <input name="quantity" type="number" min={1} step={1} required className="input" />
                </label>
                <label>
                  <span className="label">Cost each</span>
                  <input name="costPrice" type="number" min={0} step={1} required className="input" />
                </label>
              </div>
              <SubmitButton>Add to stock</SubmitButton>
            </ActionForm>
          )}
        </aside>
      </div>
    </>
  );
}
