"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";

import { CURRENCIES, currencySymbol } from "@/lib/money";

import { Menu } from "./menu";
import { usePreferences } from "./preferences";
import { cn } from "./ui";

// Display currency. Amounts aren't converted: it's the symbol and format
// your numbers are shown in.
export function CurrencyMenu() {
  const { currency, setCurrency } = usePreferences();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const list = CURRENCIES.filter((c) => !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));

  return (
    <Menu
      label={`Display currency: ${currency}`}
      panelClassName="w-72"
      trigger={() => (
        <span className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
          <span className="flex size-6 items-center justify-center rounded-full bg-surface-3 text-xs text-ink">
            {currencySymbol(currency)}
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
              placeholder="Search currency"
              aria-label="Search currency"
              className="h-10 w-full rounded-xl bg-surface-2 pr-3 pl-9 text-[15px] focus:outline-none focus:ring-2 focus:ring-accent-soft"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1" role="listbox" aria-label="Currencies">
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
                  <span className="w-8 text-center font-medium text-ink-2">{currencySymbol(c.code)}</span>
                  <span className="flex-1 text-[15px]">{c.name}</span>
                  <span className="text-xs text-ink-3">{c.code}</span>
                </button>
              </li>
            ))}
            {list.length === 0 ? <li className="px-3 py-4 text-sm text-ink-2">No match for “{query}”.</li> : null}
          </ul>
          <p className="border-t border-line px-3 pt-2 pb-1 text-xs leading-relaxed text-ink-2">
            Changes how amounts are shown. Values aren&apos;t converted.
          </p>
        </div>
      )}
    </Menu>
  );
}
