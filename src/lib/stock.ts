import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type StockRow = Awaited<ReturnType<typeof getStockRows>>[number];

/** Every product with how many are on hand and what that stock cost. Deleted (archived) products are left out unless asked for. */
export async function getStockRows(filter: Prisma.ProductWhereInput = {}) {
  const where = { archived: false, ...filter };
  const [products, unitGroups] = await Promise.all([
    db.product.findMany({
      where,
      include: { _count: { select: { saleItems: true } } },
      orderBy: [{ brand: "asc" }, { model: "asc" }, { storage: "asc" }] }),
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
    const { _count, ...product } = p;
    return { ...product, hasSales: _count.saleItems > 0, onHand, stockCost, isLow: onHand <= p.lowStockThreshold };
  });
}
