"use client";

import { createContext, use, useCallback, useMemo, useOptimistic, useTransition, type ReactNode } from "react";

import { setPreferredCurrency } from "@/actions/settings";
import { useI18n } from "@/i18n/client";
import { CURRENCIES, formatMoney } from "@/lib/money";

interface Preferences {
  // The user's preferred currency (stored on the API): totals across
  // accounts are shown in it, and new accounts default to it
  currency: string;
  timeZone: string;
  // Each account's own currency, for amounts that belong to one account
  accountCurrencies: Record<string, string>;
  // Currencies the API can convert
  currencies: string[];
  setCurrency: (code: string) => void;
  savingCurrency: boolean;
}

const PreferencesContext = createContext<Preferences | null>(null);

export function PreferencesProvider({
  currency,
  timeZone,
  accountCurrencies = {},
  currencies,
  children,
}: {
  currency: string;
  timeZone: string;
  accountCurrencies?: Record<string, string>;
  currencies?: string[] | null;
  children: ReactNode;
}) {
  // Shown right away; the server action saves it and refreshes the totals
  const [optimistic, setOptimistic] = useOptimistic(currency);
  const [savingCurrency, startTransition] = useTransition();

  const setCurrency = useCallback(
    (code: string) =>
      startTransition(async () => {
        setOptimistic(code);
        await setPreferredCurrency(code);
      }),
    [setOptimistic],
  );

  // The provider's list, or a built-in one when it's unreachable
  const list = useMemo(() => currencies ?? CURRENCIES.map((c) => c.code), [currencies]);

  const value = useMemo(
    () => ({ currency: optimistic, timeZone, accountCurrencies, currencies: list, setCurrency, savingCurrency }),
    [optimistic, timeZone, accountCurrencies, list, setCurrency, savingCurrency],
  );
  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}

export function usePreferences() {
  const value = use(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used inside PreferencesProvider");
  return value;
}

// The currency of an account's amounts, or the preferred one if unknown
export function useAccountCurrency(accountId: string | undefined | null) {
  const { accountCurrencies, currency } = usePreferences();
  return (accountId && accountCurrencies[accountId]) || currency;
}

// Formats in `currency` (default: the preferred currency), in the user's locale
export function useMoney() {
  const { currency } = usePreferences();
  const { locale } = useI18n();
  return useCallback(
    (value: number | string, options?: { compact?: boolean; sign?: boolean; currency?: string }) =>
      formatMoney(value, options?.currency ?? currency, { ...options, locale }),
    [currency, locale],
  );
}

// An amount in a currency (default: the preferred one).
// `cents` takes an integer amount of minor units (what lib/insights returns).
// `approximate` prefixes "≈" for converted totals.
export function Money({
  value,
  cents,
  sign,
  compact,
  currency,
  approximate,
  className,
}: {
  value?: number | string;
  cents?: number;
  sign?: boolean;
  compact?: boolean;
  currency?: string;
  approximate?: boolean;
  className?: string;
}) {
  const format = useMoney();
  const amount = cents !== undefined ? cents / 100 : Number(value ?? 0);
  // translate="no": the browser's page translation must never rewrite an amount
  return (
    <span translate="no" className={`tabular ${className ?? ""}`}>
      {approximate ? "≈ " : ""}
      {format(amount, { sign, compact, currency })}
    </span>
  );
}
