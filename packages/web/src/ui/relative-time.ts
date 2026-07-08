/**
 * relativeTime — formats an ISO timestamp as a short "N{s,m,h,d} ago" string, matching
 * the dashboard's compact time column. Returns "—" for a missing value. Pass `now`
 * (milliseconds since epoch) to keep the result deterministic in tests.
 */
export function relativeTime(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) {
    return "—";
  }
  const seconds = Math.max(1, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
}
