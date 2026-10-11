import "server-only";
import { cookies } from "next/headers";
import { open } from "@/lib/auth/secret-box";

// Kept out of actions.ts: everything exported from a "use server" file can be
// called from the browser, and this must never be.

/** Holds the not-yet-confirmed authenticator secret between "Turn on" and "Confirm". */
export const PENDING_TOTP_COOKIE = "zs_totp_setup";

export async function pendingTwoFactorSecret() {
  const sealed = (await cookies()).get(PENDING_TOTP_COOKIE)?.value;
  if (!sealed) return null;
  try {
    return open(sealed);
  } catch {
    return null;
  }
}
