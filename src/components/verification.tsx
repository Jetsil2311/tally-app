"use client";

import { Check, PencilSimple, SealQuestion, X } from "@phosphor-icons/react";
import { useState, useTransition } from "react";

import { reviewTransaction, verifyTransaction } from "@/actions/transactions";
import { useI18n } from "@/i18n/client";
import { toLocalInputValue } from "@/lib/dates";
import { currencySymbol } from "@/lib/money";
import { canVerify } from "@/lib/permissions";
import type { Account, Transaction } from "@/lib/types";

import { Money, useAccountCurrency, usePreferences } from "./preferences";
import { useQuickAdd } from "./quick-add";
import { useToast } from "./toast";
import { Button, Card, cn, Field, Input, inputClass, SectionTitle } from "./ui";

// Recurring charges are logged on their due date as "unverified": Tally has
// no bank connection, so someone confirms the money really moved. Until
// then they don't count toward the balance.

// Verify as logged, adjust the real amount/date first, or say it didn't
// happen. Calls onDone after a decision.
export function VerifyActions({ tx, onDone, compact }: { tx: Transaction; onDone?: () => void; compact?: boolean }) {
  const { t, locale } = useI18n();
  const { timeZone } = usePreferences();
  const toast = useToast();
  const currency = useAccountCurrency(tx.accountId);
  const [adjusting, setAdjusting] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(tx.amount);
  const [date, setDate] = useState(() => toLocalInputValue(tx.date, timeZone));

  const run = (action: () => Promise<{ ok?: boolean; message?: string }>) =>
    startTransition(async () => {
      const result = await action();
      toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
      if (result.ok) onDone?.();
    });

  const size = compact ? "sm" : "md";

  if (adjusting) {
    return (
      <form
        className="w-full space-y-3 rounded-2xl border border-line bg-surface-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => verifyTransaction(tx.id, { amount, date }));
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t.verify.realAmount} htmlFor={`verify-amount-${tx.id}`} hint={tx.originalCurrency ? t.verify.realAmountHint : undefined}>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-2" translate="no">
                {currencySymbol(currency, locale)}
              </span>
              <Input
                id={`verify-amount-${tx.id}`}
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="tabular pl-9"
              />
            </div>
          </Field>
          <Field label={t.verify.realDate} htmlFor={`verify-date-${tx.id}`}>
            <input
              id={`verify-date-${tx.id}`}
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending} className="flex-1 sm:flex-none">
            <Check size={16} weight="bold" /> {pending ? t.common.saving : t.verify.verifyAs}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setAdjusting(false)}>
            {t.common.close}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
      <Button size={size} className="flex-1 sm:flex-none" disabled={pending} onClick={() => run(() => verifyTransaction(tx.id))}>
        <Check size={16} weight="bold" /> {t.verify.verify}
      </Button>
      <Button size={size} variant="secondary" className="flex-1 sm:flex-none" disabled={pending} onClick={() => setAdjusting(true)}>
        <PencilSimple size={16} /> {t.verify.adjust}
      </Button>
      <Button
        size={size}
        variant={confirmReject ? "danger" : "ghost"}
        className={cn("flex-1 sm:flex-none", !confirmReject && "text-expense")}
        disabled={pending}
        onClick={() => (confirmReject ? run(() => reviewTransaction(tx.id, false)) : setConfirmReject(true))}
      >
        <X size={16} weight="bold" /> {confirmReject ? t.members.tapAgain : t.verify.didntHappen}
      </Button>
    </div>
  );
}

// Home and Activity: the charges waiting on you, with the actions inline
export function VerificationQueue({
  unverified,
  accounts,
  limit,
}: {
  unverified: Transaction[];
  accounts: Account[];
  limit?: number;
}) {
  const { t } = useI18n();
  const roleOf = (tx: Transaction) => accounts.find((a) => a.id === tx.accountId)?.myRole;
  const mine = unverified.filter((tx) => canVerify(roleOf(tx), tx));
  const [done, setDone] = useState<Set<string>>(new Set());
  const open = mine.filter((tx) => !done.has(tx.id));
  if (open.length === 0) return null;
  const shown = limit ? open.slice(0, limit) : open;

  return (
    <Card className="rise border-accent/25 p-3 sm:p-4" aria-labelledby="verify-title">
      <div className="flex items-start gap-3 px-3 pt-2">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <SealQuestion size={18} weight="bold" />
        </span>
        <div className="min-w-0 flex-1">
          <SectionTitle id="verify-title">
            {t.verify.title} <span className="tabular text-ink-3">· {open.length}</span>
          </SectionTitle>
          <p className="-mt-3 mb-2 text-sm leading-relaxed text-ink-2">{t.verify.hint}</p>
        </div>
      </div>
      <ul>
        {shown.map((tx) => (
          <VerifyRow key={tx.id} tx={tx} onDone={() => setDone((set) => new Set(set).add(tx.id))} />
        ))}
      </ul>
    </Card>
  );
}

function VerifyRow({ tx, onDone }: { tx: Transaction; onDone: () => void }) {
  const { t, locale } = useI18n();
  const { timeZone } = usePreferences();
  const { open } = useQuickAdd();
  const currency = useAccountCurrency(tx.accountId);
  const income = tx.type === "income";
  const when = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone }).format(new Date(tx.date));
  return (
    <li className="flex flex-col gap-2 rounded-2xl px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <button type="button" onClick={() => open({ transaction: tx })} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{tx.description || tx.category?.name || t.common.expense}</span>
          <span className="block truncate text-sm text-ink-2">
            {tx.account.name} · {when}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <Money
            value={income ? tx.amount : -Number(tx.amount)}
            currency={currency}
            sign
            className={cn("text-[15px] font-semibold", income ? "text-income" : "text-ink")}
          />
          {tx.originalAmount && tx.originalCurrency ? (
            <Money value={tx.originalAmount} currency={tx.originalCurrency} className="text-xs text-ink-3" />
          ) : null}
        </span>
      </button>
      <VerifyActions tx={tx} onDone={onDone} compact />
    </li>
  );
}
