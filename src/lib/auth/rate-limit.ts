import "server-only";
import { db } from "@/lib/db";

const MINUTE = 60_000;

// Failures allowed before sign-in is blocked for the rest of the window.
const LIMITS = {
  // One device guessing one account.
  usernameAndIp: { max: 5, window: 15 * MINUTE },
  // One device guessing many accounts.
  ip: { max: 20, window: 15 * MINUTE },
  // Many devices guessing one account. Higher, so a stranger can't easily lock the owner out.
  username: { max: 50, window: 60 * MINUTE },
};

export async function isLoginBlocked(username: string, ip: string) {
  const since = (ms: number) => new Date(Date.now() - ms);
  const [byBoth, byIp, byUser] = await Promise.all([
    db.loginAttempt.count({
      where: { success: false, username, ip, createdAt: { gte: since(LIMITS.usernameAndIp.window) } },
    }),
    db.loginAttempt.count({ where: { success: false, ip, createdAt: { gte: since(LIMITS.ip.window) } } }),
    db.loginAttempt.count({ where: { success: false, username, createdAt: { gte: since(LIMITS.username.window) } } }),
  ]);
  return byBoth >= LIMITS.usernameAndIp.max || byIp >= LIMITS.ip.max || byUser >= LIMITS.username.max;
}

export async function recordLoginAttempt(username: string, ip: string, success: boolean) {
  await db.loginAttempt.create({ data: { username: username.slice(0, 100), ip, success } });
  if (Math.random() < 0.05) {
    await db.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * MINUTE) } } });
  }
}
