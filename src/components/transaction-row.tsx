"use client";

import { ArrowDownLeft, ArrowsLeftRight, ArrowUpRight, Repeat } from "@phosphor-icons/react";

import { useI18n } from "@/i18n/client";
import { categoryLabel, isSystemCategory, isTransferCategory } from "@/lib/insights";
import type { Transaction } from "@/lib/types";

import { Avatar, displayName, TxStatusPill, useViewer } from "./people-ui";
import { Money, usePreferences } from "./preferences";
import { useQuickAdd } from "./quick-add";
import { cn } from "./ui";

// One line in any list of transactions. Tapping it opens the edit sheet.
export function TransactionRow({ tx, showDate = false }: { tx: Transaction; showDate?: boolean }) {
  const { open } = useQuickAdd();
  const { timeZone } = usePreferences();
  const { t, locale } = useI18n();
  const viewer = useViewer();
  // On shared accounts, show who added entries that aren't yours
  const byOther = tx.createdBy && tx.createdBy.id !== viewer.id ? tx.createdBy : null;
  const counts = tx.status === "approved";
  const transfer = isSystemCategory(tx.category?.name);
  const isMove = isTransferCategory(tx.category?.name);
  const missingCategory = !tx.category && tx.source !== "opening";
  const when = new Intl.DateTimeFormat(locale, {
    timeZone,
    ...(showDate ? { month: "short", day: "numeric" } : { hour: "numeric", minute: "2-digit" }),
  }).format(new Date(tx.date));

  const Icon = isMove ? ArrowsLeftRight : tx.type === "income" ? ArrowDownLeft : ArrowUpRight;
  const categoryName = tx.category ? categoryLabel(tx.category.name, t) : null;
  const title = tx.description || categoryName || (tx.type === "income" ? t.common.income : t.common.expense);

  return (
    <button
      type="button"
      onClick={() => open({ transaction: tx })}
      className="group flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-surface-2 sm:gap-4"
    >
      <span className="relative shrink-0">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            transfer ? "bg-accent-soft text-accent" : tx.type === "income" ? "bg-income-soft text-income" : "bg-surface-3 text-ink-2",
          )}
          aria-hidden
        >
          <Icon size={18} weight="bold" />
        </span>
        {byOther ? (
          <Avatar person={byOther} size={20} className="absolute -right-1 -bottom-1 ring-2 ring-surface" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5 text-[15px] font-medium text-ink">
          <span className="truncate">{title}</span>
          {tx.source === "recurring" ? (
            <Repeat size={14} weight="bold" className="shrink-0 text-ink-3" aria-label={t.transactionRow.recurring} role="img" />
          ) : null}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-ink-2">
          {tx.status !== "approved" ? <TxStatusPill status={tx.status} /> : null}
          {missingCategory && counts ? (
            <span className="shrink-0 rounded-full bg-warn-soft px-2 py-px text-xs font-medium text-warn">{t.transactionRow.noCategory}</span>
          ) : tx.description && tx.category ? (
            <span className="shrink-0">{categoryName}</span>
          ) : null}
          <span className="min-w-0 truncate text-ink-3">
            {missingCategory || (tx.description && tx.category) ? "· " : ""}
            {tx.account.name}
            {byOther ? ` · ${displayName(byOther, t.audit.someone)}` : ""}
            <span className={showDate ? "" : "hidden sm:inline"}> · {when}</span>
          </span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <Money
          value={tx.type === "income" ? tx.amount : -Number(tx.amount)}
          sign
          className={cn(
            "text-[15px] font-semibold",
            // Pending and rejected entries don't count: shown struck/dimmed
            !counts && "text-ink-3",
            tx.status === "rejected" && "line-through",
            counts && (transfer ? "text-ink-2" : tx.type === "income" ? "text-income" : "text-ink"),
          )}
        />
      </span>
    </button>
  );
}
