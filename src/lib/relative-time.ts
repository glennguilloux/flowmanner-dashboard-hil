/**
 * Client-safe relative time formatter. Avoids importing date-fns in client
 * components for simple "3m ago" / "2h ago" / "5d ago" strings.
 *
 * Accepts an ISO date string or Date object.
 */
export function relativeTime(input: string | Date): string {
  const now = Date.now();
  const then = input instanceof Date ? input.getTime() : new Date(input).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
