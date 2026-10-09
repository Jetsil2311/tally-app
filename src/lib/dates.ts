// Calendar math in the user's time zone. The API filters by instants
// ([from, to) in UTC), so "October" has to be turned into the exact UTC
// instants of local midnight on Oct 1 and Nov 1. Otherwise a coffee bought
// at 11pm on the 31st would land in the next month.

export type MonthKey = `${number}-${string}`; // "2026-10"

function partsIn(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month") - 1,
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

// Milliseconds the zone is ahead of UTC at a given instant
function offsetAt(instant: number, timeZone: string) {
  const p = partsIn(new Date(instant), timeZone);
  const asUtc = Date.UTC(p.year, p.month, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

// The UTC instant of a wall-clock time in a zone (month is 0-based, may overflow)
export function zonedToUtc(year: number, month: number, day: number, timeZone: string, hour = 0, minute = 0) {
  const guess = Date.UTC(year, month, day, hour, minute);
  let instant = guess - offsetAt(guess, timeZone);
  // Second pass corrects for a DST change between the guess and the answer
  instant = guess - offsetAt(instant, timeZone);
  return new Date(instant);
}

export function todayParts(timeZone: string, now: Date) {
  return partsIn(now, timeZone);
}

export function monthKeyOf(year: number, month: number): MonthKey {
  const d = new Date(Date.UTC(year, month, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(timeZone: string, now: Date): MonthKey {
  const p = partsIn(now, timeZone);
  return monthKeyOf(p.year, p.month);
}

export function parseMonthKey(value: string | undefined | null): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return null;
  return { year: Number(match[1]), month };
}

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonthKey(key)!;
  return monthKeyOf(year, month + delta);
}

export function monthRange(key: MonthKey, timeZone: string) {
  const { year, month } = parseMonthKey(key)!;
  return {
    from: zonedToUtc(year, month, 1, timeZone).toISOString(),
    to: zonedToUtc(year, month + 1, 1, timeZone).toISOString(),
  };
}

export function yearRange(year: number, timeZone: string) {
  return {
    from: zonedToUtc(year, 0, 1, timeZone).toISOString(),
    to: zonedToUtc(year + 1, 0, 1, timeZone).toISOString(),
  };
}

export function daysInMonth(key: MonthKey) {
  const { year, month } = parseMonthKey(key)!;
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// "2026-10-05" for an instant, as seen in the zone
export function dayKey(iso: string | Date, timeZone: string) {
  const p = partsIn(typeof iso === "string" ? new Date(iso) : iso, timeZone);
  return `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

// In the user's language; Spanish month names come lowercase ("octubre de
// 2026"), so headings wrap this in capitalize() from i18n/format
export function monthLabel(key: MonthKey, style: "long" | "short" = "long", withYear = true, locale = "en-US") {
  const { year, month } = parseMonthKey(key)!;
  return new Intl.DateTimeFormat(locale, {
    month: style,
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

// Value for <input type="datetime-local"> in the zone
export function toLocalInputValue(iso: string | Date, timeZone: string) {
  const p = partsIn(typeof iso === "string" ? new Date(iso) : iso, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

// Inverse of toLocalInputValue
export function fromLocalInputValue(value: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, m, d, h, min] = match.map(Number);
  return zonedToUtc(y, m - 1, d, timeZone, h, min);
}
