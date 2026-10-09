// Recurring payment helpers shared by server and client code.
// The API stores due dates as UTC midnight: "2026-11-01T00:00:00.000Z" means
// November 1st wherever you are, so they're formatted in UTC, never shifted
// into the user's time zone.

import type { Dictionary } from "@/i18n/dictionaries";

import { toCents } from "./money";
import type { FundingStatus, RecurringFrequency, RecurringPayment } from "./types";

export const FREQUENCIES: RecurringFrequency[] = ["weekly", "monthly", "yearly"];

type RecurringStrings = Dictionary["recurring"];

// "2026-11-01" from an API date
export function dateOnly(iso: string) {
  return iso.slice(0, 10);
}

export function formatDue(iso: string, locale: string, style: "short" | "long" = "short") {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    ...(style === "short" ? { month: "short", day: "numeric" } : { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
  }).format(new Date(iso));
}

// Whole days from `today` ("2026-10-08") to the due date; negative when overdue
export function daysUntil(iso: string, today: string) {
  return Math.round((Date.parse(dateOnly(iso)) - Date.parse(today)) / 86_400_000);
}

export function relativeDue(iso: string, today: string, t: Dictionary, locale: string) {
  const days = daysUntil(iso, today);
  if (days < -1) return t.recurring.daysLate(-days);
  if (days === -1) return t.common.yesterday;
  if (days === 0) return t.common.today;
  if (days === 1) return t.common.tomorrow;
  if (days < 7) return t.recurring.inDays(days);
  return formatDue(iso, locale);
}

// "Every month on the 15th" / "Cada mes el día 15", "Every 2 weeks on Friday"
export function scheduleLabel(
  { frequency, interval, startDate }: Pick<RecurringPayment, "frequency" | "interval" | "startDate">,
  t: RecurringStrings,
  locale: string,
) {
  const every = t.every(frequency, interval);
  const start = new Date(startDate);
  if (frequency === "weekly") {
    return `${every} ${t.onWeekday(new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "long" }).format(start))}`;
  }
  if (frequency === "monthly") return `${every} ${t.onDay(start.getUTCDate())}`;
  return `${every} ${t.onDate(formatDue(startDate, locale))}`;
}

// What the payment costs (or brings in) per month on average, in cents
export function monthlyCents({ amount, frequency, interval }: Pick<RecurringPayment, "amount" | "frequency" | "interval">) {
  const cents = toCents(amount);
  if (frequency === "weekly") return Math.round((cents * 52) / 12 / interval);
  if (frequency === "monthly") return Math.round(cents / interval);
  return Math.round(cents / 12 / interval);
}

// How each forecast status looks. The label comes from the dictionary;
// it's always text plus icon, never colour alone.
export const STATUS_TONE: Record<FundingStatus, "ok" | "warn" | "income" | "muted"> = {
  covered: "ok",
  insufficient: "warn",
  income: "income",
  noCheck: "muted",
  accountInactive: "muted",
  rateUnavailable: "warn",
};
