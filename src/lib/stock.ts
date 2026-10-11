import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type StockRow = Awaited<ReturnType<typeof getStockRows>>[number];

/** Every product with how many are on hand and what that stock cost. */
export async function getStockRows(where: Prisma.ProductWhereInput = {}) {
  const [products, unitGroups] = await Promise.all([
    db.product.findMany({ where, orderBy: [{ brand: "asc" }, { model: "asc" }, { storage: "asc" }] }),
    db.unit.groupBy({
      by: ["productId"],
      where: { status: "IN_STOCK" },
      _count: { _all: true },
      _sum: { costPrice: true },
    }),
  ]);
  const byProduct = new Map(unitGroups.map((g) => [g.productId, g]));

  return products.map((p) => {
    const group = byProduct.get(p.id);
    const onHand = p.category === "PHONE" ? (group?._count._all ?? 0) : p.quantity;
    const stockCost = p.category === "PHONE" ? (group?._sum.costPrice ?? 0) : p.quantity * p.costPrice;
    return { ...p, onHand, stockCost, isLow: onHand <= p.lowStockThreshold };
  });
}
