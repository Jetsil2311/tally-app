"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";

import { useI18n } from "@/i18n/client";
import { currencyName, currencySymbol } from "@/lib/money";

import { Menu } from "./menu";
import { usePreferences } from "./preferences";
import { cn } from "./ui";

// The preferred currency: totals across accounts are converted to it (on
// the API), and new accounts start in it. Each account keeps its own.
export function CurrencyMenu() {
  const { currency, setCurrency, currencies } = usePreferences();
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const q = query.trim().toLocaleLowerCase();
  // The currencies the API can convert
  const list = currencies.map((code) => ({ code, name: currencyName(code, locale) })).filter(
    (c) => !q || c.code.toLowerCase().includes(q) || c.name.toLocaleLowerCase().includes(q),
  );

  return (
    <Menu
      label={t.currency.label(currency)}
      // On phones the trigger sits mid-header, so a right-aligned 18rem panel
      // would hang off the left edge: pin it to the screen edges instead
      panelClassName="w-72 max-sm:fixed max-sm:inset-x-4 max-sm:top-[calc(env(safe-area-inset-top)+4.5rem)] max-sm:w-auto"
      trigger={() => (
        <span className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
          <span className="flex size-6 items-center justify-center rounded-full bg-surface-3 text-xs text-ink">
            {currencySymbol(currency, locale)}
          </span>
          {currency}
        </span>
      )}
    >
      {(close) => (
        <div>
          <div className="relative p-1">
            <MagnifyingGlass size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-ink-3" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.currency.search}
              aria-label={t.currency.search}
              className="h-10 w-full rounded-xl bg-surface-2 pr-3 pl-9 text-[15px] focus:outline-none focus:ring-2 focus:ring-accent-soft"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1" role="listbox" aria-label={t.currency.list}>
            {list.map((c) => (
              <li key={c.code} role="option" aria-selected={c.code === currency}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrency(c.code);
                    close();
                  }}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left transition-colors hover:bg-surface-2",
                    c.code === currency && "bg-surface-2",
                  )}
                >
                  <span className="w-8 text-center font-medium text-ink-2">{currencySymbol(c.code, locale)}</span>
                  <span className="flex-1 text-[15px]">{c.name}</span>
                  <span className="text-xs text-ink-3">{c.code}</span>
                </button>
              </li>
            ))}
            {list.length === 0 ? <li className="px-3 py-4 text-sm text-ink-2">{t.currency.noMatch(query)}</li> : null}
          </ul>
          <p className="border-t border-line px-3 pt-2 pb-1 text-xs leading-relaxed text-ink-2">
            {t.currency.hint}
          </p>
        </div>
      )}
    </Menu>
  );
}
