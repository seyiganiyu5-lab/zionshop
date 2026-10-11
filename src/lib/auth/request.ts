import { headers } from "next/headers";

export async function requestInfo() {
  const h = await headers();
  // On Vercel these are set by the platform, not the client.
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = (h.get("user-agent") ?? "").slice(0, 300) || null;
  return { ip, userAgent };
}
