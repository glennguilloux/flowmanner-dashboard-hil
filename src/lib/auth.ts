import { headers } from "next/headers";

const SECRET = process.env.HIL_AUTH_SECRET;

/**
 * Returns true if auth is required and the current request lacks a valid
 * bearer token. Skips the check entirely when HIL_AUTH_SECRET is unset
 * (dev mode) so local development works without configuration.
 */
export async function isUnauthorized(): Promise<boolean> {
  if (!SECRET) return false; // dev mode — no secret configured

  const hdrs = await headers();
  const auth = hdrs.get("authorization");
  if (!auth?.startsWith("Bearer ")) return true;
  return auth.slice(7) !== SECRET;
}
