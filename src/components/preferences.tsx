"use client";

import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

import { formatMoney } from "@/lib/money";

interface Preferences {
  currency: string;
  timeZone: string;
  setCurrency: (code: string) => void;
}

const PreferencesContext = createContext<Preferences | null>(null);

// Display preferences for every client component under the app shell.
// The server reads the same cookies, so the first render already matches.
export function PreferencesProvider({
  currency: initialCurrency,
  timeZone,
  children,
}: {
  currency: string;
  timeZone: string;
  children: ReactNode;
}) {
  const [currency, setCurrencyState] = useState(initialCurrency);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    document.cookie = `ft_currency=${encodeURIComponent(code)}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  const value = useMemo(() => ({ currency, timeZone, setCurrency }), [currency, timeZone, setCurrency]);
  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}

export function usePreferences() {
  const value = use(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used inside PreferencesProvider");
  return value;
}

export function useMoney() {
  const { currency } = usePreferences();
  return useCallback(
    (value: number | string, options?: { compact?: boolean; sign?: boolean }) => formatMoney(value, currency, options),
    [currency],
  );
}

// Formats an amount in the chosen display currency.
// `cents` takes an integer amount of cents (what lib/insights returns).
export function Money({
  value,
  cents,
  sign,
  compact,
  className,
}: {
  value?: number | string;
  cents?: number;
  sign?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const format = useMoney();
  const amount = cents !== undefined ? cents / 100 : Number(value ?? 0);
  return <span className={`tabular ${className ?? ""}`}>{format(amount, { sign, compact })}</span>;
}
