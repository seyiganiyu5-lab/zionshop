import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// Encrypts small secrets (the authenticator key) at rest, so a database leak
// alone isn't enough to generate login codes.

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters");
  }
  return Buffer.from(hkdfSync("sha256", secret, "zionshop", "totp-secret", 32));
}

export function seal(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function open(sealed: string) {
  const raw = Buffer.from(sealed, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}
