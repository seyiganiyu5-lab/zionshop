// Emergency access reset for when the owner is locked out (forgotten
// password or lost phone). It sets a new password, turns off two-step
// verification and signs out every device.
//
// Needs direct database access, so only someone with the DATABASE_URL can
// run it:
//
//   DATABASE_URL="..." node scripts/reset-owner.mjs <username> <new-password>
//
// Uses the same scrypt format as src/lib/auth/password.ts.

import { randomBytes, scrypt } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const [username, password] = process.argv.slice(2);
if (!username || !password || password.length < 12) {
  console.error("Usage: node scripts/reset-owner.mjs <username> <new-password (12+ characters)>");
  process.exit(1);
}

const N = 2 ** 15, r = 8, p = 1;
const salt = randomBytes(16);
const key = await new Promise((resolve, reject) =>
  scrypt(password.normalize("NFKC"), salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? reject(e) : resolve(k))),
);
const passwordHash = ["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$");

const db = new PrismaClient();
const name = username.trim().toLowerCase();
const data = { passwordHash, passwordChangedAt: new Date(), totpEnabled: false, totpSecret: null, totpLastStep: null };
const user = await db.user.upsert({ where: { username: name }, update: data, create: { username: name, ...data } });
await db.session.deleteMany({ where: { userId: user.id } });
await db.loginAttempt.deleteMany({ where: { username: name } });
console.log(`Reset "${name}". Two-step verification is off; turn it back on after signing in.`);
await db.$disconnect();
