"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { cleanImei } from "@/lib/imei";
import { productName } from "@/lib/format";

export type SellableUnit = {
  kind: "unit";
  unitId: string;
  productId: string;
  name: string;
  imei: string;
  condition: "NEW" | "USED" | "REFURBISHED";
  price: number;
};

/** Anything counted by quantity: accessories, and phones not tracked by IMEI. */
export type SellableAccessory = {
  kind: "accessory";
  category: "PHONE" | "ACCESSORY";
  productId: string;
  name: string;
  price: number;
  available: number;
};

export type Sellable = SellableUnit | SellableAccessory;

/** Find in-stock phones (by IMEI or model) and accessories matching the search. */
export async function searchSellable(query: string): Promise<Sellable[]> {
  await requireUser();
  const q = String(query).trim().slice(0, 100);
  if (q.length < 2) return [];
  const digits = cleanImei(q);
  const words = q.split(/\s+/).filter(Boolean);
  // Every word has to match the brand, model, storage or colour.
  const textMatch = words.map((w) => ({
    OR: [
      { brand: { contains: w, mode: "insensitive" as const } },
      { model: { contains: w, mode: "insensitive" as const } },
      { storage: { contains: w, mode: "insensitive" as const } },
      { color: { contains: w, mode: "insensitive" as const } },
    ],
  }));

  const [units, accessories] = await Promise.all([
    db.unit.findMany({
      where: {
        status: "IN_STOCK",
        OR: [
          ...(/^\d{4,}$/.test(digits) ? [{ imei: { contains: digits } }] : []),
          { product: { AND: textMatch } },
        ],
        product: { archived: false },
      },
      include: { product: true },
      orderBy: { addedAt: "asc" },
      take: 30,
    }),
    db.product.findMany({
      where: { trackImei: false, archived: false, quantity: { gt: 0 }, AND: textMatch },
      take: 15,
    }),
  ]);

  return [
    ...units.map(
      (u): SellableUnit => ({
        kind: "unit",
        unitId: u.id,
        productId: u.productId,
        name: productName(u.product),
        imei: u.imei,
        condition: u.condition,
        price: u.product.sellPrice,
      }),
    ),
    ...accessories.map(
      (p): SellableAccessory => ({
        kind: "accessory",
        category: p.category,
        productId: p.id,
        name: productName(p),
        price: p.sellPrice,
        available: p.quantity,
      }),
    ),
  ];
}

const price = z.number().int().min(0).max(1_000_000_000);
const saleSchema = z.object({
  paymentMethod: z.enum(["CASH", "TRANSFER", "CARD"]),
  customerName: z.string().trim().max(100).optional(),
  customerPhone: z.string().trim().max(30).optional(),
  items: z
    .array(
      z.discriminatedUnion("kind", [
        z.object({ kind: z.literal("unit"), unitId: z.string(), price }),
        z.object({ kind: z.literal("accessory"), productId: z.string(), quantity: z.number().int().min(1).max(10_000), price }),
      ]),
    )
    .min(1)
    .max(100),
});

export type SaleInput = z.input<typeof saleSchema>;

class SaleError extends Error {}

export async function createSale(input: SaleInput): Promise<{ saleId?: string; error?: string }> {
  await requireUser();
  const { t } = await getI18n();
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.path[0] === "items" && !input?.items?.length ? t.sell.addItem : t.sell.invalid };
  }
  const { items, paymentMethod, customerName, customerPhone } = parsed.data;

  const unitIds = items.flatMap((i) => (i.kind === "unit" ? [i.unitId] : []));
  if (new Set(unitIds).size !== unitIds.length) return { error: t.sell.duplicate };

  try {
    const sale = await db.$transaction(async (tx) => {
      const lines = [];
      for (const item of items) {
        if (item.kind === "unit") {
          // Only flips IN_STOCK -> SOLD, so two sales can't take the same phone.
          const claimed = await tx.unit.updateMany({
            where: { id: item.unitId, status: "IN_STOCK" },
            data: { status: "SOLD" },
          });
          if (claimed.count !== 1) throw new SaleError(t.sell.alreadySold);
          const unit = await tx.unit.findUniqueOrThrow({ where: { id: item.unitId } });
          lines.push({
            productId: unit.productId,
            unitId: unit.id,
            quantity: 1,
            unitPrice: item.price,
            costPrice: unit.costPrice,
          });
        } else {
          const taken = await tx.product.updateMany({
            where: { id: item.productId, trackImei: false, archived: false, quantity: { gte: item.quantity } },
            data: { quantity: { decrement: item.quantity } },
          });
          if (taken.count !== 1) throw new SaleError(t.sell.notEnough);
          const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
          lines.push({
            productId: product.id,
            unitId: null,
            quantity: item.quantity,
            unitPrice: item.price,
            costPrice: product.costPrice,
          });
        }
      }

      return tx.sale.create({
        data: {
          paymentMethod,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          total: lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
          items: { create: lines },
        },
      });
    });

    revalidatePath("/", "layout");
    return { saleId: sale.id };
  } catch (e) {
    if (e instanceof SaleError) return { error: e.message };
    throw e;
  }
}
