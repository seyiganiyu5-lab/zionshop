"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/lib/auth/password";
import { isLoginBlocked, recordLoginAttempt } from "@/lib/auth/rate-limit";
import { requestInfo } from "@/lib/auth/request";
import { open } from "@/lib/auth/secret-box";
import { createSession, destroyCurrentSession } from "@/lib/auth/session";
import { checkTotp } from "@/lib/auth/totp";
import { getI18n } from "@/lib/i18n/server";

export type LoginState = { error?: string; needCode?: boolean } | null;

const sameString = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

const slowDown = () => new Promise((r) => setTimeout(r, 400 + Math.random() * 400));

/**
 * The very first sign-in creates the owner account from ADMIN_USERNAME and
 * ADMIN_PASSWORD. Once an account exists those variables are ignored.
 */
async function bootstrapOwner(username: string, password: string) {
  if ((await db.user.count()) > 0) return null;
  const envUser = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD;
  if (!envUser || !envPassword) return "not-configured" as const;
  if (!sameString(username, envUser) || !sameString(password, envPassword)) return null;
  return db.user.create({ data: { username, passwordHash: await hashPassword(password) } });
}

export async function login(prev: LoginState, formData: FormData): Promise<LoginState> {
  const { t } = await getI18n();
  const username = String(formData.get("username") ?? "").trim().toLowerCase().slice(0, 100);
  const password = String(formData.get("password") ?? "").slice(0, 1000);
  const code = String(formData.get("code") ?? "").trim();
  const { ip } = await requestInfo();

  if (!username || !password) return { error: t.auth.invalid };
  if (await isLoginBlocked(username, ip)) return { error: t.auth.tooMany, needCode: prev?.needCode };

  let user = await db.user.findUnique({ where: { username } });
  if (!user) {
    const created = await bootstrapOwner(username, password);
    if (created === "not-configured") return { error: t.auth.notConfigured };
    user = created;
  }

  const passwordOk = user ? await verifyPassword(password, user.passwordHash) : (await burnPasswordCheck(password), false);
  if (!user || !passwordOk) {
    await recordLoginAttempt(username, ip, false);
    await slowDown();
    return { error: t.auth.invalid };
  }

  if (user.totpEnabled && user.totpSecret) {
    if (!code) return { needCode: true };
    const step = checkTotp(open(user.totpSecret), user.username, code);
    // updateMany with the step condition makes each code single-use, even under races.
    const accepted =
      step !== null &&
      (
        await db.user.updateMany({
          where: { id: user.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
          data: { totpLastStep: step },
        })
      ).count === 1;
    if (!accepted) {
      await recordLoginAttempt(username, ip, false);
      await slowDown();
      return { error: t.auth.invalidCode, needCode: true };
    }
  }

  await recordLoginAttempt(username, ip, true);
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroyCurrentSession();
  redirect("/login");
}
