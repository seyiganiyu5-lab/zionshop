import "server-only";
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt with N=2^15 costs ~32 MB and ~100 ms per guess, which makes
// offline cracking of a leaked hash very slow.
const PARAMS = { N: 2 ** 15, r: 8, p: 1 };
const KEY_LENGTH = 64;
const MAX_MEM = 64 * 1024 * 1024;

export const MIN_PASSWORD_LENGTH = 12;

function derive(password: string, salt: Buffer, opts: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { ...opts, maxmem: MAX_MEM }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await derive(password, Buffer.from(salt, "base64"), { N: Number(n), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

let dummyHash: Promise<string> | undefined;

/** Spend the same time as a real check so unknown usernames can't be detected by timing. */
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummyHash);
}
