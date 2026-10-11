import "server-only";
import { Secret, TOTP } from "otpauth";

const PERIOD = 30;

function totp(secretBase32: string, username: string) {
  return new TOTP({
    issuer: "Zionshop",
    label: username,
    algorithm: "SHA1",
    digits: 6,
    period: PERIOD,
    secret: Secret.fromBase32(secretBase32),
  });
}

export function newTotpSecret() {
  return new Secret({ size: 20 }).base32;
}

export function totpUri(secretBase32: string, username: string) {
  return totp(secretBase32, username).toString();
}

/**
 * Returns the time step the code belongs to, or null if it's wrong.
 * Allows one step of clock drift either way. Callers must reject steps
 * at or before the last one used, so a code can't be replayed.
 */
export function checkTotp(secretBase32: string, username: string, code: string) {
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return null;
  const delta = totp(secretBase32, username).validate({ token, window: 1 });
  if (delta === null) return null;
  return Math.floor(Date.now() / 1000 / PERIOD) + delta;
}
