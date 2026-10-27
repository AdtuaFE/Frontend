/**
 * "Mar 1, 2026". A bare "yyyy-mm-dd" is read as that local day — `new Date()` would read it as
 * UTC midnight, which is the previous evening in US time zones.
 */
export function formatDate(value: string | Date): string {
  const day = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  const date = day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
