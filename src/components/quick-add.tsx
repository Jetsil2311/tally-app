"use client";

import { ArrowDown, ArrowsLeftRight, ArrowUp, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import {
  createContext,
  Suspense,
  use,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createTransfer, deleteTransaction, restoreTransaction, saveTransaction, undoCreate } from "@/actions/transactions";
import { useI18n } from "@/i18n/client";
import { toLocalInputValue } from "@/lib/dates";
import { isSystemCategory } from "@/lib/insights";
import { currencySymbol } from "@/lib/money";
import type { Account, ActionState, Category, Transaction, TransactionType } from "@/lib/types";

import { AccountIcon } from "./account-icon";
import { ChipGroup, Segmented } from "./chips";
import { usePreferences } from "./preferences";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { submitWith } from "./use-form-action";
import { Button, buttonClass, cn, Field, Input, inputClass, Skeleton } from "./ui";

type Mode = TransactionType | "transfer";

interface OpenOptions {
  mode?: Mode;
  transaction?: Transaction;
  accountId?: string;
}

interface QuickAddContextValue {
  open: (options?: OpenOptions) => void;
}

const QuickAddContext = createContext<QuickAddContextValue | null>(null);

export function useQuickAdd() {
  const value = use(QuickAddContext);
  if (!value) throw new Error("useQuickAdd must be used inside QuickAddProvider");
  return value;
}

const LAST_ACCOUNT_KEY = "tally:last-account";

// Global "add" sheet. Opened from the dock, page buttons, a transaction row
// (to edit), or the N key from anywhere.
export function QuickAddProvider({
  accounts,
  categories,
  children,
}: {
  accounts: Promise<Account[]>;
  categories: Promise<Category[]>;
  children: ReactNode;
}) {
  const [state, setState] = useState<(OpenOptions & { session: number }) | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const session = useRef(0);

  const open = useCallback((options: OpenOptions = {}) => {
    session.current += 1;
    setState({ ...options, session: session.current });
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable], dialog[open]")) return;
      const key = event.key.toLowerCase();
      if (key === "n" || key === "e") {
        event.preventDefault();
        open({ mode: "expense" });
      } else if (key === "i") {
        event.preventDefault();
        open({ mode: "income" });
      } else if (key === "t") {
        event.preventDefault();
        open({ mode: "transfer" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const value = useMemo(() => ({ open }), [open]);
  const editing = Boolean(state?.transaction);
  const { t } = useI18n();

  return (
    <QuickAddContext value={value}>
      {children}
      <Sheet
        open={isOpen}
        onClose={close}
        title={editing ? t.quickAdd.editTransaction : t.quickAdd.newEntry}
        description={editing ? undefined : t.quickAdd.description}
      >
        {state ? (
          <Suspense fallback={<FormSkeleton />}>
            <EntryForms key={state.session} options={state} accounts={accounts} categories={categories} onDone={close} />
          </Suspense>
        ) : null}
      </Sheet>
    </QuickAddContext>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-5 pb-2">
      <Skeleton className="h-10 w-full rounded-full" />
      <Skeleton className="mx-auto h-20 w-48" />
      <Skeleton className="h-11 w-3/4 rounded-full" />
      <Skeleton className="h-11 w-full rounded-full" />
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}

function EntryForms({
  options,
  accounts: accountsPromise,
  categories: categoriesPromise,
  onDone,
}: {
  options: OpenOptions;
  accounts: Promise<Account[]>;
  categories: Promise<Category[]>;
  onDone: () => void;
}) {
  const accounts = use(accountsPromise);
  const categories = use(categoriesPromise);
  const [mode, setMode] = useState<Mode>(options.transaction?.type ?? options.mode ?? "expense");
  const { t } = useI18n();

  if (accounts.length === 0) {
    return (
      <div className="pb-4 text-center">
        <p className="text-ink-2">{t.quickAdd.addAccountFirst}</p>
        <Link href="/accounts?new=1" onClick={onDone} className={cn(buttonClass("primary"), "mt-5")}>
          {t.quickAdd.createAccount}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!options.transaction ? (
        <Segmented
          label={t.quickAdd.entryType}
          value={mode}
          onChange={setMode}
          className="w-full"
          options={[
            { value: "expense", label: t.common.expense, icon: <ArrowUp size={16} weight="bold" /> },
            { value: "income", label: t.common.income, icon: <ArrowDown size={16} weight="bold" /> },
            { value: "transfer", label: t.common.transfer, icon: <ArrowsLeftRight size={16} weight="bold" /> },
          ]}
        />
      ) : null}
      {mode === "transfer" ? (
        <TransferForm accounts={accounts} onDone={onDone} />
      ) : (
        <TransactionForm
          key={mode}
          type={mode}
          transaction={options.transaction}
          defaultAccountId={options.accountId}
          accounts={accounts}
          categories={categories}
          onDone={onDone}
        />
      )}
    </div>
  );
}

export function AmountInput({
  defaultValue,
  error,
  result,
  tone,
}: {
  defaultValue?: string;
  error?: string;
  result: ActionState; // the latest submission result; a new one re-shows the error
  tone: "income" | "expense" | "neutral";
}) {
  const { currency } = usePreferences();
  const { t, locale } = useI18n();
  // Hide a stale error as soon as the amount is edited
  const [shownError, setShownError] = useState(error);
  const [lastResult, setLastResult] = useState(result);
  if (result !== lastResult) {
    setLastResult(result);
    setShownError(error);
  }
  return (
    <div>
      <label htmlFor="amount" className="sr-only">
        {t.quickAdd.amount}
      </label>
      <div
        className={cn(
          "flex items-baseline justify-center gap-1 rounded-3xl px-4 py-5 transition-colors",
          tone === "income" ? "bg-income-soft" : tone === "expense" ? "bg-expense-soft" : "bg-accent-soft",
        )}
      >
        <span className="text-3xl font-medium text-ink-2">{currencySymbol(currency, locale)}</span>
        <input
          id="amount"
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          autoFocus
          required
          placeholder="0.00"
          defaultValue={defaultValue}
          aria-invalid={Boolean(shownError)}
          aria-describedby={shownError ? "amount-message" : undefined}
          onChange={() => setShownError(undefined)}
          className="tabular max-w-[9ch] bg-transparent text-center text-5xl font-semibold tracking-tight text-ink placeholder:text-ink-3/60 focus:outline-none"
          style={{ fieldSizing: "content", minWidth: "4ch" } as React.CSSProperties}
        />
      </div>
      {shownError ? (
        <p id="amount-message" role="alert" className="mt-2 text-center text-sm text-expense">
          {shownError}
        </p>
      ) : null}
    </div>
  );
}

function TransactionForm({
  type,
  transaction,
  defaultAccountId,
  accounts,
  categories,
  onDone,
}: {
  type: TransactionType;
  transaction?: Transaction;
  defaultAccountId?: string;
  accounts: Account[];
  categories: Category[];
  onDone: () => void;
}) {
  const toast = useToast();
  const { timeZone } = usePreferences();
  const { t } = useI18n();
  const keepOpen = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const activeAccounts = accounts.filter((a) => a.isActive);
  const [accountId, setAccountId] = useState(() => {
    if (transaction) return transaction.accountId;
    if (defaultAccountId) return defaultAccountId;
    try {
      const last = localStorage.getItem(LAST_ACCOUNT_KEY);
      if (last && activeAccounts.some((a) => a.id === last)) return last;
    } catch {}
    return activeAccounts[0]?.id ?? "";
  });

  const usable = categories.filter((c) => !isSystemCategory(c.name));
  const topLevel = usable.filter((c) => !c.parentId);
  const initialCategory = usable.find((c) => c.id === transaction?.categoryId);
  const [parentId, setParentId] = useState(initialCategory?.parentId ?? initialCategory?.id ?? "");
  const [childId, setChildId] = useState(initialCategory?.parentId ? initialCategory.id : "");
  const children = usable.filter((c) => c.parentId === parentId);
  const categoryId = childId || parentId;

  const [defaultDate] = useState(() => toLocalInputValue(transaction?.date ?? new Date(), timeZone));

  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await saveTransaction(prev, formData);
    if (result.ok) {
      try {
        localStorage.setItem(LAST_ACCOUNT_KEY, String(formData.get("accountId")));
      } catch {}
      const createdId = result.data?.id;
      toast(result.message ?? t.common.saved, {
        action:
          !transaction && createdId
            ? { label: t.common.undo, onClick: () => void undoCreate(createdId).then((r) => toast(r.message ?? t.common.done)) }
            : undefined,
      });
      if (keepOpen.current && !transaction) {
        // Keep account, category and date; clear what's unique to each entry
        const fields = formRef.current?.elements;
        const amount = fields?.namedItem("amount") as HTMLInputElement | null;
        const note = fields?.namedItem("description") as HTMLInputElement | null;
        if (note) note.value = "";
        if (amount) {
          amount.value = "";
          amount.focus();
        }
      } else {
        onDone();
      }
    }
    return result;
  }, {});

  const errors = state.fieldErrors ?? {};

  return (
    <form ref={formRef} onSubmit={submitWith(formAction)} className="space-y-6" noValidate>
      {transaction ? <input type="hidden" name="id" value={transaction.id} /> : null}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="categoryId" value={categoryId} />

      <AmountInput defaultValue={transaction?.amount} error={errors.amount} result={state} tone={type} />

      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-medium text-ink">{type === "income" ? t.quickAdd.into : t.quickAdd.paidWith}</legend>
        <ChipGroup
          label={t.common.account}
          name="accountId"
          value={accountId}
          onChange={setAccountId}
          invalid={Boolean(errors.accountId)}
          options={activeAccounts.map((account) => ({
            value: account.id,
            label: account.name,
            icon: <AccountIcon type={account.type} size={18} />,
          }))}
        />
        {errors.accountId ? (
          <p role="alert" className="text-sm text-expense">
            {errors.accountId}
          </p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="mb-3 flex w-full items-baseline justify-between text-sm font-medium text-ink">
          {t.common.category}
          <Link href="/categories" className="text-xs font-normal text-ink-2 underline-offset-4 hover:underline">
            {t.common.manage}
          </Link>
        </legend>
        {topLevel.length === 0 ? (
          <p className="rounded-2xl bg-surface-2 p-4 text-sm text-ink-2">
            {t.quickAdd.noCategories(
              <Link href="/categories" className="font-medium text-accent underline-offset-4 hover:underline">
                {t.quickAdd.addSome}
              </Link>,
            )}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              <CategoryChip active={!parentId} onClick={() => (setParentId(""), setChildId(""))}>
                {t.common.none}
              </CategoryChip>
              {topLevel.map((category) => (
                <CategoryChip
                  key={category.id}
                  active={parentId === category.id}
                  onClick={() => {
                    setParentId(category.id);
                    setChildId("");
                  }}
                >
                  {category.name}
                </CategoryChip>
              ))}
            </div>
            {children.length > 0 ? (
              <div className="flex flex-wrap gap-2 rounded-2xl bg-surface-2 p-2">
                {children.map((category) => (
                  <CategoryChip
                    key={category.id}
                    small
                    active={childId === category.id}
                    onClick={() => setChildId(childId === category.id ? "" : category.id)}
                  >
                    {category.name}
                  </CategoryChip>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.common.note} htmlFor="description" optional error={errors.description}>
          <Input
            id="description"
            name="description"
            placeholder={type === "income" ? t.quickAdd.notePlaceholderIncome : t.quickAdd.notePlaceholderExpense}
            defaultValue={transaction?.description ?? ""}
            maxLength={500}
            autoComplete="off"
          />
        </Field>
        <Field label={t.common.when} htmlFor="date" error={errors.date}>
          <input id="date" name="date" type="datetime-local" defaultValue={defaultDate} required className={inputClass} />
        </Field>
      </div>

      {state.message && !state.ok && !Object.keys(errors).length ? (
        <p role="alert" className="rounded-2xl bg-expense-soft px-4 py-3 text-sm text-expense">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {transaction ? (
          <DeleteButton id={transaction.id} onDone={onDone} />
        ) : (
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            disabled={pending}
            onClick={() => (keepOpen.current = true)}
            className="sm:flex-1"
          >
            {t.quickAdd.saveAndAddAnother}
          </Button>
        )}
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          onClick={() => (keepOpen.current = false)}
          className="sm:flex-1"
        >
          {pending ? t.common.saving : transaction ? t.common.saveChanges : type === "income" ? t.quickAdd.addIncome : t.quickAdd.addExpense}
        </Button>
      </div>
    </form>
  );
}

function CategoryChip({
  active,
  onClick,
  small,
  children,
}: {
  active: boolean;
  onClick: () => void;
  small?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.97]",
        small ? "min-h-9 px-3 text-sm" : "min-h-11 px-4 text-[15px]",
        active ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-ink hover:border-line-strong",
      )}
    >
      {children}
    </button>
  );
}

function DeleteButton({ id, onDone }: { id: string; onDone: () => void }) {
  const toast = useToast();
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  if (!confirming) {
    return (
      <Button type="button" variant="ghost" size="lg" onClick={() => setConfirming(true)} className="text-expense sm:flex-1">
        <Trash size={18} /> {t.common.delete}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="danger"
      size="lg"
      disabled={pending}
      className="sm:flex-1"
      onClick={async () => {
        setPending(true);
        const result = await deleteTransaction(id);
        setPending(false);
        if (result.ok) {
          const snapshot = result.data!;
          toast(t.quickAdd.deleted, {
            action: { label: t.common.undo, onClick: () => void restoreTransaction(snapshot).then((r) => toast(r.message ?? t.common.done)) },
          });
          onDone();
        } else {
          toast(result.message ?? t.quickAdd.couldntDelete, { tone: "error" });
        }
      }}
    >
      <Trash size={18} /> {pending ? t.common.deleting : t.common.tapAgainToDelete}
    </Button>
  );
}

function TransferForm({ accounts, onDone }: { accounts: Account[]; onDone: () => void }) {
  const toast = useToast();
  const { timeZone } = usePreferences();
  const { t } = useI18n();
  const active = accounts.filter((a) => a.isActive);
  const [from, setFrom] = useState(active.find((a) => a.type !== "creditCard")?.id ?? active[0]?.id ?? "");
  const [to, setTo] = useState(active.find((a) => a.id !== from && a.type === "creditCard")?.id ?? active.find((a) => a.id !== from)?.id ?? "");
  const [defaultDate] = useState(() => toLocalInputValue(new Date(), timeZone));

  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createTransfer(prev, formData);
    if (result.ok) {
      toast(result.message ?? t.common.saved);
      onDone();
    }
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};

  if (active.length < 2) {
    return (
      <p className="rounded-2xl bg-surface-2 p-4 text-sm text-ink-2">
        {t.quickAdd.transferNeedsTwo}
      </p>
    );
  }

  const options = active.map((account) => ({
    value: account.id,
    label: account.name,
    icon: <AccountIcon type={account.type} size={18} />,
  }));

  return (
    <form onSubmit={submitWith(formAction)} className="space-y-6" noValidate>
      <AmountInput error={errors.amount} result={state} tone="neutral" />
      <fieldset>
        <legend className="mb-3 text-sm font-medium">{t.quickAdd.from}</legend>
        <ChipGroup label={t.quickAdd.fromAccount} name="fromAccountId" value={from} onChange={setFrom} options={options} invalid={Boolean(errors.fromAccountId)} />
        {errors.fromAccountId ? <p role="alert" className="mt-2 text-sm text-expense">{errors.fromAccountId}</p> : null}
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-sm font-medium">{t.quickAdd.to}</legend>
        <ChipGroup label={t.quickAdd.toAccount} name="toAccountId" value={to} onChange={setTo} options={options.filter((o) => o.value !== from)} invalid={Boolean(errors.toAccountId)} />
        {errors.toAccountId ? <p role="alert" className="mt-2 text-sm text-expense">{errors.toAccountId}</p> : null}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.common.note} htmlFor="transfer-note" optional>
          <Input id="transfer-note" name="description" placeholder={t.quickAdd.transferNotePlaceholder} autoComplete="off" />
        </Field>
        <Field label={t.common.when} htmlFor="transfer-date" error={errors.date}>
          <input id="transfer-date" name="date" type="datetime-local" defaultValue={defaultDate} className={inputClass} />
        </Field>
      </div>
      <p className="text-sm text-ink-2">{t.quickAdd.transferNotCounted}</p>
      {state.message && !state.ok && !Object.keys(errors).length ? (
        <p role="alert" className="rounded-2xl bg-expense-soft px-4 py-3 text-sm text-expense">{state.message}</p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? t.common.saving : t.quickAdd.recordTransfer}
      </Button>
    </form>
  );
}
