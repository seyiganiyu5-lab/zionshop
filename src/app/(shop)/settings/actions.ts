"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from "@/lib/auth/password";
import { open, seal } from "@/lib/auth/secret-box";
import { requireUser } from "@/lib/auth/session";
import { checkTotp, newTotpSecret } from "@/lib/auth/totp";
import { getI18n } from "@/lib/i18n/server";
import type { FormResult } from "@/components/ActionForm";
import { PENDING_TOTP_COOKIE, pendingTwoFactorSecret } from "./pending";


const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

export async function changePassword(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const session = await requireUser();
  const { t } = await getI18n();
  const current = field(formData, "current");
  const next = field(formData, "next");

  if (!(await verifyPassword(current, session.user.passwordHash))) return { error: t.settings.wrongPassword };
  if (next.length < MIN_PASSWORD_LENGTH || next.length > 1000) return { error: t.settings.tooShort(MIN_PASSWORD_LENGTH) };
  if (next !== field(formData, "confirm")) return { error: t.settings.mismatch };
  if (next === current) return { error: t.settings.samePassword };

  await db.$transaction([
    db.user.update({
      where: { id: session.userId },
      data: { passwordHash: await hashPassword(next), passwordChangedAt: new Date() },
    }),
    // Anyone else who was signed in, e.g. with a stolen password, is kicked out.
    db.session.deleteMany({ where: { userId: session.userId, id: { not: session.id } } }),
  ]);
  revalidatePath("/settings");
  return { ok: t.settings.passwordChanged };
}

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,32}$/);

export async function changeUsername(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const session = await requireUser();
  const { t } = await getI18n();
  const parsed = usernameSchema.safeParse(formData.get("username"));
  if (!parsed.success) return { error: t.settings.usernameInvalid };
  if (!(await verifyPassword(field(formData, "password"), session.user.passwordHash))) {
    return { error: t.settings.wrongPassword };
  }
  try {
    await db.user.update({ where: { id: session.userId }, data: { username: parsed.data } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: t.settings.usernameInvalid };
    throw e;
  }
  revalidatePath("/settings");
  return { ok: t.settings.usernameChanged };
}

export async function startTwoFactor() {
  await requireUser();
  (await cookies()).set(PENDING_TOTP_COOKIE, seal(newTotpSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/settings",
    maxAge: 10 * 60,
  });
  revalidatePath("/settings");
}

export async function cancelTwoFactorSetup() {
  await requireUser();
  (await cookies()).delete({ name: PENDING_TOTP_COOKIE, path: "/settings" });
  revalidatePath("/settings");
}

export async function confirmTwoFactor(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const session = await requireUser();
  const { t } = await getI18n();
  const secret = await pendingTwoFactorSecret();
  if (!secret) return { error: t.settings.setupExpired };

  const step = checkTotp(secret, session.user.username, field(formData, "code"));
  if (step === null) return { error: t.settings.badCode };

  await db.user.update({
    where: { id: session.userId },
    data: { totpSecret: seal(secret), totpEnabled: true, totpLastStep: step },
  });
  (await cookies()).delete({ name: PENDING_TOTP_COOKIE, path: "/settings" });
  revalidatePath("/", "layout");
  return { ok: t.settings.enabled2fa };
}

export async function disableTwoFactor(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const session = await requireUser();
  const { t } = await getI18n();
  const { user } = session;
  if (!(await verifyPassword(field(formData, "password"), user.passwordHash))) return { error: t.settings.wrongPassword };
  if (!user.totpSecret || checkTotp(open(user.totpSecret), user.username, field(formData, "code")) === null) {
    return { error: t.settings.badCode };
  }
  await db.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null, totpLastStep: null },
  });
  revalidatePath("/", "layout");
  return { ok: t.settings.disabled2fa };
}

export async function signOutOtherDevices(_prev: FormResult): Promise<FormResult> {
  const session = await requireUser();
  const { t } = await getI18n();
  await db.session.deleteMany({ where: { userId: session.userId, id: { not: session.id } } });
  revalidatePath("/settings");
  return { ok: t.settings.signedOutOthers };
}
