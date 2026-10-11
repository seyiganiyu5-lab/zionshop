import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_COOKIE } from "./cookie";
import { requestInfo } from "./request";

const HOUR = 60 * 60 * 1000;
/** Signed out after this long no matter what. */
const MAX_AGE = 7 * 24 * HOUR;
/** Signed out after this long without using the site. */
const IDLE_TIMEOUT = 12 * HOUR;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const { ip, userAgent } = await requestInfo();
  const expiresAt = new Date(Date.now() + MAX_AGE);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt, ip, userAgent } });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** The signed-in user for this request, or null. */
export const getCurrentSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() < now || session.lastSeenAt.getTime() < now - IDLE_TIMEOUT) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.lastSeenAt.getTime() < now - 5 * 60_000) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  }
  return session;
});

/**
 * Call at the top of every page and server action. Server actions can be
 * called directly, so the middleware redirect alone is not enough.
 */
export async function requireUser() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}
