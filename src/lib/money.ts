// Money helpers shared by server and client code.
// The API sends amounts as decimal strings. Sums here are done in integer
// cents so 0.1 + 0.2 never shows up as 0.30000000000000004.

export function toCents(value: string | number) {
  const n = typeof value === "number" ? value : Number(value);
  return Math.round(n * 100);
}

export function fromCents(cents: number) {
  return cents / 100;
}

export const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "GBP", name: "British Pound" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "COP", name: "Colombian Peso" },
  { code: "ARS", name: "Argentine Peso" },
  { code: "CLP", name: "Chilean Peso" },
  { code: "PEN", name: "Peruvian Sol" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "INR", name: "Indian Rupee" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "KRW", name: "South Korean Won" },
] as const;

export function isCurrency(code: string) {
  return CURRENCIES.some((c) => c.code === code);
}

const formatters = new Map<string, Intl.NumberFormat>();

// `locale` shapes separators and symbol placement ("1.234,50 €" in es-ES,
// "$1,234.50" in es-MX); `currency` is the user's display currency
export function formatMoney(
  value: number | string,
  currency: string,
  { compact = false, sign = false, locale = "en-US" }: { compact?: boolean; sign?: boolean; locale?: string } = {},
) {
  const key = `${locale}|${currency}|${compact}|${sign}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 1 : undefined,
      signDisplay: sign ? "exceptZero" : "auto",
    });
    formatters.set(key, formatter);
  }
  return formatter.format(typeof value === "string" ? Number(value) : value);
}

export function currencySymbol(currency: string, locale = "en-US") {
  return (
    new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? currency
  );
}

// "Mexican Peso" / "peso mexicano", from the browser's own locale data
export function currencyName(code: string, locale = "en-US") {
  try {
    const name = new Intl.DisplayNames([locale], { type: "currency" }).of(code) ?? code;
    return name.charAt(0).toLocaleUpperCase() + name.slice(1);
  } catch {
    return CURRENCIES.find((c) => c.code === code)?.name ?? code;
  }
}

export function percent(value: number, locale = "en-US", digits = 0) {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: digits,
  }).format(value);
}

// ---------------------------------------------------------------------------
// Converting between currencies
// ---------------------------------------------------------------------------

// Multipliers into one target currency, from GET /exchange-rates:
// { USD: 18.2 } means 1 USD = 18.2 of the target. The target itself is 1.
export type Rates = Record<string, number>;

// Cents (minor units) of `from` in the target currency; null when there's no rate
export function convertCents(cents: number, from: string, rates: Rates) {
  const rate = rates[from];
  return rate === undefined ? null : Math.round(cents * rate);
}

// Adds amounts that may be in different currencies. `approximate` is true
// when anything was converted (today's rate), `missing` counts amounts that
// couldn't be converted and were left out.
export function sumConverted(items: { cents: number; currency: string }[], target: string, rates: Rates) {
  let cents = 0;
  let approximate = false;
  let missing = 0;
  for (const item of items) {
    if (item.currency === target) {
      cents += item.cents;
      continue;
    }
    const converted = convertCents(item.cents, item.currency, rates);
    if (converted === null) missing += 1;
    else {
      cents += converted;
      approximate = true;
    }
  }
  return { cents, approximate, missing };
}
