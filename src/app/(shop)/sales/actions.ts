"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { FormResult } from "@/components/ActionForm";

/** Undo a sale entered by mistake (or a full refund): items go back into stock. */
export async function voidSale(saleId: string, _prev: FormResult): Promise<FormResult> {
  await db.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { items: true } });
    if (!sale) return;
    for (const item of sale.items) {
      if (item.unitId) {
        await tx.unit.update({ where: { id: item.unitId }, data: { status: "IN_STOCK" } });
      } else {
        await tx.product.update({ where: { id: item.productId }, data: { quantity: { increment: item.quantity } } });
      }
    }
    await tx.sale.delete({ where: { id: saleId } });
  });
  revalidatePath("/", "layout");
  redirect("/sales");
}
