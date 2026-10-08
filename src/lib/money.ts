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

export function formatMoney(
  value: number | string,
  currency: string,
  { compact = false, sign = false }: { compact?: boolean; sign?: boolean } = {},
) {
  const key = `${currency}|${compact}|${sign}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
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

export function currencySymbol(currency: string) {
  return (
    new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? currency
  );
}

export function percent(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: digits,
  }).format(value);
}
