const AUTH_TOKEN = process.env.NEXT_PUBLIC_HIL_AUTH_SECRET;

/**
 * Drop-in replacement for `fetch()` that automatically attaches the
 * Bearer token from NEXT_PUBLIC_HIL_AUTH_SECRET when configured.
 * No-ops gracefully when the env var is unset (dev mode).
 */
export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);

  if (AUTH_TOKEN && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${AUTH_TOKEN}`);
  }

  return fetch(input, { ...init, headers });
}
