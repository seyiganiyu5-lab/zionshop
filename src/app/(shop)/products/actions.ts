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

export async function createProduct(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const t = await begin();
  const parsed = productSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error, t) };

  const product = await db.product.create({ data: parsed.data });
  revalidateStock();
  redirect(`/products/${product.id}`);
}

export async function updateProduct(id: string, _prev: FormResult, formData: FormData): Promise<FormResult> {
  const t = await begin();
  const parsed = productSchema(t).omit({ category: true }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error, t) };

  await db.product.update({ where: { id }, data: parsed.data });
  revalidateStock(id);
  return { ok: t.stockMsg.saved };
}

export async function deleteProduct(id: string, _prev: FormResult): Promise<FormResult> {
  const t = await begin();
  const [units, sales] = await Promise.all([
    db.unit.count({ where: { productId: id } }),
    db.saleItem.count({ where: { productId: id } }),
  ]);
  if (units > 0 || sales > 0) return { error: t.stockMsg.cantDelete };
  await db.product.delete({ where: { id } });
  revalidateStock();
  redirect("/products");
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

  const product = await db.product.findUnique({ where: { id: productId }, select: { category: true } });
  if (product?.category !== "PHONE") return { error: t.common.invalidInput };

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

export async function deleteUnit(unitId: string, _prev: FormResult): Promise<FormResult> {
  const t = await begin();
  const unit = await db.unit.findUnique({ where: { id: unitId } });
  if (!unit) return { error: t.stockMsg.phoneNotFound };
  if (unit.status !== "IN_STOCK") return { error: t.stockMsg.soldCantDelete };
  await db.unit.delete({ where: { id: unitId } });
  revalidateStock(unit.productId);
  return { ok: t.stockMsg.removed };
}

const receiveSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(100_000),
  costPrice: money,
});

/** Receive accessory stock. Cost becomes the weighted average of old and new stock. */
export async function receiveAccessories(productId: string, _prev: FormResult, formData: FormData): Promise<FormResult> {
  const t = await begin();
  const parsed = receiveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: t.common.invalidInput };
  const { quantity, costPrice } = parsed.data;

  await db.$transaction(async (tx) => {
    const p = await tx.product.findUniqueOrThrow({ where: { id: productId, category: "ACCESSORY" } });
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
  await db.product.update({ where: { id: productId, category: "ACCESSORY" }, data: { quantity: quantity.data } });
  revalidateStock(productId);
  return { ok: t.stockMsg.countUpdated };
}
