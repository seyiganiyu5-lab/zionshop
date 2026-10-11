"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { cleanImei, isValidImei } from "@/lib/imei";
import { getI18n } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/en";
import type { FormResult } from "@/components/ActionForm";

const MAX_PRICE = 1_000_000_000;
const money = z.coerce.number().int().min(0).max(MAX_PRICE);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const productSchema = (t: Dictionary) =>
  z.object({
    category: z.enum(["PHONE", "ACCESSORY"]),
    brand: z.string().trim().min(1, t.stockMsg.brandRequired).max(60),
    model: z.string().trim().min(1, t.stockMsg.modelRequired).max(100),
    storage: optionalText(30),
    color: optionalText(30),
    sellPrice: money,
    lowStockThreshold: z.coerce.number().int().min(0).max(100_000),
  });

/** Auth check plus translations; every action starts with this. */
async function begin() {
  await requireUser();
  return (await getI18n()).t;
}

function firstError(error: z.ZodError, t: Dictionary) {
  const issue = error.issues[0];
  // Only brand and model carry their own message; anything else gets a generic one.
  const field = issue?.path[0];
  return issue && (field === "brand" || field === "model") && issue.code === "too_small" ? issue.message : t.common.invalidInput;
}

function revalidateStock(productId?: string) {
  revalidatePath("/");
  revalidatePath("/products");
  if (productId) revalidatePath(`/products/${productId}`);
}

const startingStockSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(1_000_000).catch(0),
  costPrice: money.catch(0),
});

export async function createProduct(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const t = await begin();
  const parsed = productSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error, t) };

  // Accessories are always counted; phones are tracked by IMEI unless the box is unticked.
  const trackImei = parsed.data.category === "PHONE" && formData.get("trackImei") === "on";
  const stock = trackImei
    ? { quantity: 0, costPrice: 0 }
    : startingStockSchema.parse({ quantity: formData.get("quantity") || 0, costPrice: formData.get("costPrice") || 0 });

  const product = await db.product.create({ data: { ...parsed.data, trackImei, ...stock } });
  revalidateStock();
  redirect(`/products/${product.id}`);
}

export async function updateProduct(id: string, _prev: FormResult, formData: FormData): Promise<FormResult> {
  const t = await begin();
  const parsed = productSchema(t).omit({ category: true }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error, t) };

  const current = await db.product.findUnique({ where: { id }, select: { category: true, trackImei: true, quantity: true } });
  if (!current) return { error: t.common.invalidInput };

  // Phones can switch between IMEI tracking and counting, but only with no stock
  // on hand, so nothing is lost or counted twice.
  let trackImei = current.trackImei;
  if (current.category === "PHONE" && formData.get("trackImeiShown") === "1") {
    trackImei = formData.get("trackImei") === "on";
    if (trackImei !== current.trackImei) {
      if (!trackImei && (await db.unit.count({ where: { productId: id, status: "IN_STOCK" } })) > 0) {
        return { error: t.stockMsg.cantSwitchToCount };
      }
      if (trackImei && current.quantity > 0) return { error: t.stockMsg.cantSwitchToImei };
    }
  }

  await db.product.update({ where: { id }, data: { ...parsed.data, trackImei } });
  revalidateStock(id);
  return { ok: t.stockMsg.saved };
}

/**
 * Never-sold products are deleted outright. Products with sales are archived
 * instead (hidden, stock cleared) so past sales keep their product.
 */
export async function deleteProduct(id: string, _prev: FormResult): Promise<FormResult> {
  await begin();
  const hasSales = (await db.saleItem.count({ where: { productId: id } })) > 0;
  await db.$transaction(async (tx) => {
    await tx.unit.deleteMany({ where: { productId: id, status: "IN_STOCK" } });
    if (hasSales) {
      await tx.product.update({ where: { id }, data: { archived: true, quantity: 0 } });
    } else {
      await tx.product.delete({ where: { id } });
    }
  });
  revalidateStock(id);
  redirect(hasSales ? "/products?show=archived" : "/products");
}

export async function restoreProduct(id: string, _prev: FormResult): Promise<FormResult> {
  const t = await begin();
  await db.product.update({ where: { id }, data: { archived: false } });
  revalidateStock(id);
  return { ok: t.stockMsg.restored };
}

/** Stock can't be added to a deleted (archived) product. */
async function assertActive(productId: string, t: Dictionary) {
  const product = await db.product.findUnique({ where: { id: productId }, select: { archived: true, trackImei: true } });
  if (!product) return { error: t.common.invalidInput };
  if (product.archived) return { error: t.stockMsg.archived };
  return { product };
}

const unitsSchema = z.object({
  imeis: z.string().max(20_000),
  condition: z.enum(["NEW", "USED", "REFURBISHED"]),
  costPrice: money,
  supplier: optionalText(100),
  notes: optionalText(300),
});

/** Add one or more phones. IMEIs can be scanned in one per line. */
export async function addUnits(productId: string, _prev: FormResult, formData: FormData): Promise<FormResult> {
  const t = await begin();
  const parsed = unitsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: t.common.invalidInput };
  const { imeis: raw, ...rest } = parsed.data;

  const active = await assertActive(productId, t);
  if (!active.product) return { error: active.error };
  if (!active.product.trackImei) return { error: t.common.invalidInput };

  const imeis = [...new Set(raw.split(/[\n,]+/).map(cleanImei).filter(Boolean))];
  if (imeis.length === 0) return { error: t.stockMsg.enterImei };

  const invalid = imeis.filter((i) => !isValidImei(i));
  if (invalid.length > 0) return { error: t.stockMsg.invalidImeis(invalid.slice(0, 20).join("\n")) };

  const existing = await db.unit.findMany({ where: { imei: { in: imeis } }, select: { imei: true } });
  if (existing.length > 0) return { error: t.stockMsg.existingImeis(existing.map((e) => e.imei).join("\n")) };

  try {
    await db.unit.createMany({ data: imeis.map((imei) => ({ imei, productId, ...rest })) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: t.stockMsg.raceImei };
    throw e;
  }
  revalidateStock(productId);
  return { ok: t.stockMsg.addedPhones(imeis.length) };
}

const unitEditSchema = z.object({
  imei: z.string().transform(cleanImei),
  condition: z.enum(["NEW", "USED", "REFURBISHED"]),
  costPrice: money,
  supplier: optionalText(100),
  notes: optionalText(300),
});

/** Fix a phone's details. Only phones still in stock, so sales records stay accurate. */
export async function updateUnit(unitId: string, _prev: FormResult, formData: FormData): Promise<FormResult> {
  const t = await begin();
  const parsed = unitEditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: t.common.invalidInput };
  if (!isValidImei(parsed.data.imei)) return { error: t.stockMsg.imeiInvalid };

  const unit = await db.unit.findUnique({ where: { id: unitId } });
  if (!unit) return { error: t.stockMsg.phoneNotFound };
  if (unit.status !== "IN_STOCK") return { error: t.product.soldLocked };

  try {
    await db.unit.update({ where: { id: unitId, status: "IN_STOCK" }, data: parsed.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: t.stockMsg.imeiTaken };
    throw e;
  }
  revalidateStock(unit.productId);
  return { ok: t.stockMsg.unitSaved };
}

export async function removeUnits(productId: string, _prev: FormResult, formData: FormData): Promise<FormResult> {
  const t = await begin();
  const ids = formData.getAll("unitId").map(String).slice(0, 1000);
  if (ids.length === 0) return { error: t.stockMsg.nothingSelected };
  // Sold phones are skipped by the status filter; their sales stay intact.
  const { count } = await db.unit.deleteMany({ where: { id: { in: ids }, productId, status: "IN_STOCK" } });
  revalidateStock(productId);
  return { ok: t.stockMsg.removedMany(count) };
}

const receiveSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(100_000),
  costPrice: money,
});

/** Receive counted (non-IMEI) stock. Cost becomes the weighted average of old and new stock. */
export async function receiveAccessories(productId: string, _prev: FormResult, formData: FormData): Promise<FormResult> {
  const t = await begin();
  const parsed = receiveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: t.common.invalidInput };
  const { quantity, costPrice } = parsed.data;
  const active = await assertActive(productId, t);
  if (!active.product) return { error: active.error };

  await db.$transaction(async (tx) => {
    const p = await tx.product.findUniqueOrThrow({ where: { id: productId, trackImei: false } });
    const total = p.quantity + quantity;
    const avgCost = Math.round((p.quantity * p.costPrice + quantity * costPrice) / total);
    await tx.product.update({ where: { id: productId }, data: { quantity: total, costPrice: avgCost } });
  });
  revalidateStock(productId);
  return { ok: t.stockMsg.added(quantity) };
}

/** Correct the on-hand count after a stock take, damage, or loss. */
export async function setAccessoryQuantity(productId: string, _prev: FormResult, formData: FormData): Promise<FormResult> {
  const t = await begin();
  const quantity = z.coerce.number().int().min(0).max(1_000_000).safeParse(formData.get("quantity"));
  if (!quantity.success) return { error: t.stockMsg.countInvalid };
  const active = await assertActive(productId, t);
  if (!active.product) return { error: active.error };
  await db.product.update({ where: { id: productId, trackImei: false }, data: { quantity: quantity.data } });
  revalidateStock(productId);
  return { ok: t.stockMsg.countUpdated };
}
