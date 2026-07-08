/** Serializes a filter object into string query params, dropping empty/undefined values. */
export function toQuery(filters: Record<string, string | number | undefined>): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") query[key] = String(value);
  }
  return query;
}
