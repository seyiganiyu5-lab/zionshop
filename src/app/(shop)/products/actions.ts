"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { cleanImei, isValidImei } from "@/lib/imei";
import type { FormResult } from "@/components/ActionForm";

const money = z.coerce.number().int("Use whole amounts").min(0, "Can't be negative");
const optionalText = z
  .string()
  .trim()
  .transform((v) => v || null);

const productSchema = z.object({
  category: z.enum(["PHONE", "ACCESSORY"]),
  brand: z.string().trim().min(1, "Brand is required"),
  model: z.string().trim().min(1, "Model is required"),
  storage: optionalText,
  color: optionalText,
  sellPrice: money,
  lowStockThreshold: z.coerce.number().int().min(0),
});

function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid input";
}

function revalidateStock(productId?: string) {
  revalidatePath("/");
  revalidatePath("/products");
  if (productId) revalidatePath(`/products/${productId}`);
}

export async function createProduct(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const product = await db.product.create({ data: parsed.data });
  revalidateStock();
  redirect(`/products/${product.id}`);
}

export async function updateProduct(id: string, _prev: FormResult, formData: FormData): Promise<FormResult> {
  const parsed = productSchema.omit({ category: true }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  await db.product.update({ where: { id }, data: parsed.data });
  revalidateStock(id);
  return { ok: "Saved." };
}

export async function deleteProduct(id: string, _prev: FormResult): Promise<FormResult> {
  const [units, sales] = await Promise.all([
    db.unit.count({ where: { productId: id } }),
    db.saleItem.count({ where: { productId: id } }),
  ]);
  if (units > 0 || sales > 0) {
    return { error: "This product has phones or sales recorded against it, so it can't be deleted." };
  }
  await db.product.delete({ where: { id } });
  revalidateStock();
  redirect("/products");
}

const unitsSchema = z.object({
  imeis: z.string(),
  condition: z.enum(["NEW", "USED", "REFURBISHED"]),
  costPrice: money,
  supplier: optionalText,
  notes: optionalText,
});

/** Add one or more phones. IMEIs can be scanned in one per line. */
export async function addUnits(productId: string, _prev: FormResult, formData: FormData): Promise<FormResult> {
  const parsed = unitsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { imeis: raw, ...rest } = parsed.data;

  const imeis = [...new Set(raw.split(/[\n,]+/).map(cleanImei).filter(Boolean))];
  if (imeis.length === 0) return { error: "Enter at least one IMEI." };

  const invalid = imeis.filter((i) => !isValidImei(i));
  if (invalid.length > 0) {
    return { error: `These don't look like valid 15-digit IMEIs:\n${invalid.join("\n")}` };
  }

  const existing = await db.unit.findMany({ where: { imei: { in: imeis } }, select: { imei: true } });
  if (existing.length > 0) {
    return { error: `Already in the system:\n${existing.map((e) => e.imei).join("\n")}` };
  }

  try {
    await db.unit.createMany({ data: imeis.map((imei) => ({ imei, productId, ...rest })) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "One of these IMEIs was just added. Refresh and try again." };
    }
    throw e;
  }
  revalidateStock(productId);
  return { ok: `Added ${imeis.length} phone${imeis.length === 1 ? "" : "s"}.` };
}

export async function deleteUnit(unitId: string, _prev: FormResult): Promise<FormResult> {
  const unit = await db.unit.findUnique({ where: { id: unitId } });
  if (!unit) return { error: "Phone not found." };
  if (unit.status !== "IN_STOCK") return { error: "Sold phones can't be deleted." };
  await db.unit.delete({ where: { id: unitId } });
  revalidateStock(unit.productId);
  return { ok: "Removed." };
}

const receiveSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  costPrice: money,
});

/** Receive accessory stock. Cost becomes the weighted average of old and new stock. */
export async function receiveAccessories(productId: string, _prev: FormResult, formData: FormData): Promise<FormResult> {
  const parsed = receiveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { quantity, costPrice } = parsed.data;

  await db.$transaction(async (tx) => {
    const p = await tx.product.findUniqueOrThrow({ where: { id: productId } });
    const total = p.quantity + quantity;
    const avgCost = Math.round((Math.max(p.quantity, 0) * p.costPrice + quantity * costPrice) / Math.max(total, 1));
    await tx.product.update({ where: { id: productId }, data: { quantity: total, costPrice: avgCost } });
  });
  revalidateStock(productId);
  return { ok: `Added ${quantity}.` };
}

/** Correct the on-hand count after a stock take, damage, or loss. */
export async function setAccessoryQuantity(productId: string, _prev: FormResult, formData: FormData): Promise<FormResult> {
  const quantity = z.coerce.number().int().min(0).safeParse(formData.get("quantity"));
  if (!quantity.success) return { error: "Enter a whole number, 0 or more." };
  await db.product.update({ where: { id: productId }, data: { quantity: quantity.data } });
  revalidateStock(productId);
  return { ok: "Count updated." };
}
