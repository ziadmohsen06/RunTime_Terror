// Small pure helpers for calendar dates written as 'YYYY-MM-DD' (UTC).
// Strings in this format sort the same way as the dates they stand for.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isValidDateKey(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  // A month/day out of range (e.g. "13", "32") still matches DATE_PATTERN, but the
  // string parser rejects it outright rather than rolling it over like "2026-02-30"
  // does. Date#toISOString() throws on that Invalid Date, so this must be checked
  // before calling toDateKey, or an out-of-range date crashes instead of being
  // reported as an ordinary validation error.
  return !Number.isNaN(date.getTime()) && toDateKey(date) === value;
}

export function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}

// Weeks run Monday to Sunday.
export function mondayOf(dateKey: string): string {
  const dayOfWeek = new Date(`${dateKey}T00:00:00Z`).getUTCDay() || 7;
  return addDays(dateKey, 1 - dayOfWeek);
}