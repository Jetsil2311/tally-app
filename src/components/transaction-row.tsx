"use client";

import { ArrowDownLeft, ArrowsLeftRight, ArrowUpRight } from "@phosphor-icons/react";

import { isSystemCategory, isTransferCategory } from "@/lib/insights";
import type { Transaction } from "@/lib/types";

import { Money, usePreferences } from "./preferences";
import { useQuickAdd } from "./quick-add";
import { cn } from "./ui";

// One line in any list of transactions. Tapping it opens the edit sheet.
export function TransactionRow({ tx, showDate = false }: { tx: Transaction; showDate?: boolean }) {
  const { open } = useQuickAdd();
  const { timeZone } = usePreferences();
  const transfer = isSystemCategory(tx.category?.name);
  const isMove = isTransferCategory(tx.category?.name);
  const missingCategory = !tx.category && tx.source !== "opening";
  const when = new Intl.DateTimeFormat("en-US", {
    timeZone,
    ...(showDate ? { month: "short", day: "numeric" } : { hour: "numeric", minute: "2-digit" }),
  }).format(new Date(tx.date));

  const Icon = isMove ? ArrowsLeftRight : tx.type === "income" ? ArrowDownLeft : ArrowUpRight;
  const title = tx.description || tx.category?.name || (tx.type === "income" ? "Income" : "Expense");

  return (
    <button
      type="button"
      onClick={() => open({ transaction: tx })}
      className="group flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-surface-2 sm:gap-4"
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full",
          transfer ? "bg-accent-soft text-accent" : tx.type === "income" ? "bg-income-soft text-income" : "bg-surface-3 text-ink-2",
        )}
        aria-hidden
      >
        <Icon size={18} weight="bold" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-ink">{title}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-ink-2">
          {missingCategory ? (
            <span className="shrink-0 rounded-full bg-warn-soft px-2 py-px text-xs font-medium text-warn">No category</span>
          ) : tx.description && tx.category ? (
            <span className="shrink-0">{tx.category.name}</span>
          ) : null}
          <span className="min-w-0 truncate text-ink-3">
            {missingCategory || (tx.description && tx.category) ? "· " : ""}
            {tx.account.name}
            <span className={showDate ? "" : "hidden sm:inline"}> · {when}</span>
          </span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <Money
          value={tx.type === "income" ? tx.amount : -Number(tx.amount)}
          sign
          className={cn("text-[15px] font-semibold", transfer ? "text-ink-2" : tx.type === "income" ? "text-income" : "text-ink")}
        />
      </span>
    </button>
  );
}
