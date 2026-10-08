"use client";

import { ArrowCounterClockwise, Archive, PencilSimple, Plus, Receipt, Wallet } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import { saveAccount, setAccountActive } from "@/actions/accounts";
import { currencySymbol } from "@/lib/money";
import type { Account, AccountType, ActionState } from "@/lib/types";

import { AccountCard } from "./account-card";
import { ACCOUNT_TYPES, AccountIcon } from "./account-icon";
import { Money, usePreferences } from "./preferences";
import { useQuickAdd } from "./quick-add";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, buttonClass, Card, cn, EmptyState, Field, IconButton, Input } from "./ui";
import { submitWith } from "./use-form-action";

export interface AccountStats {
  income: number;
  expense: number;
  count: number;
}

export function AccountsManager({
  accounts,
  stats,
  openNew,
}: {
  accounts: Account[];
  stats: Record<string, AccountStats>;
  openNew: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ account?: Account; session: number } | null>(openNew ? { session: 0 } : null);
  const [open, setOpen] = useState(openNew);
  const active = accounts.filter((a) => a.isActive);
  const archived = accounts.filter((a) => !a.isActive);

  const start = (account?: Account) => {
    setEditing({ account, session: (editing?.session ?? 0) + 1 });
    setOpen(true);
  };
  // "New account" links elsewhere point at /accounts?new=1; open the form
  // when that param shows up while this page is already mounted
  const [seenNew, setSeenNew] = useState(openNew);
  if (openNew !== seenNew) {
    setSeenNew(openNew);
    if (openNew) {
      setEditing({ session: (editing?.session ?? 0) + 1 });
      setOpen(true);
    }
  }
  const close = () => {
    setOpen(false);
    if (openNew) router.replace("/accounts", { scroll: false });
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 pt-2">
        <h1 className="rise text-[28px] font-semibold tracking-tight sm:text-[32px]">Accounts</h1>
        <Button onClick={() => start()}>
          <Plus size={18} weight="bold" /> New account
        </Button>
      </div>

      {active.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet size={24} />}
            title="Where does your money live?"
            action={<Button onClick={() => start()}>Add your first account</Button>}
          >
            Add a cash wallet, a debit card, or a credit card. Each one tracks its own balance.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((account, i) => (
            <AccountTile key={account.id} account={account} stats={stats[account.id]} index={i} onEdit={() => start(account)} />
          ))}
        </div>
      )}

      {archived.length > 0 ? (
        <section aria-labelledby="archived-title" className="pt-4">
          <h2 id="archived-title" className="mb-3 text-[17px] font-semibold tracking-tight">
            Archived
          </h2>
          <p className="mb-4 max-w-[60ch] text-sm text-ink-2">
            Archived accounts keep their history and still count in reports, but can&apos;t take new entries.
          </p>
          <Card className="divide-y divide-line">
            {archived.map((account) => (
              <ArchivedRow key={account.id} account={account} />
            ))}
          </Card>
        </section>
      ) : null}

      <Sheet open={open} onClose={close} title={editing?.account ? "Edit account" : "New account"}>
        {editing ? <AccountForm key={editing.session} account={editing.account} onDone={close} /> : null}
      </Sheet>
    </>
  );
}

function AccountTile({
  account,
  stats,
  index,
  onEdit,
}: {
  account: Account;
  stats?: AccountStats;
  index: number;
  onEdit: () => void;
}) {
  const { open } = useQuickAdd();
  return (
    <div className="rise flex flex-col gap-3" style={{ "--i": index } as React.CSSProperties}>
      <AccountCard account={account} href={`/activity?account=${account.id}`} />
      <Card className="flex items-center gap-2 p-2 pl-4">
        <div className="min-w-0 flex-1 text-sm">
          <p className="text-ink-2">This month</p>
          <p className="truncate">
            <Money cents={stats?.income ?? 0} className="font-medium text-income" />{" "}
            <span className="text-ink-3">in ·</span> <Money cents={stats?.expense ?? 0} className="font-medium" />{" "}
            <span className="text-ink-3">out</span>
          </p>
        </div>
        <IconButton label={`Add entry to ${account.name}`} onClick={() => open({ mode: "expense", accountId: account.id })}>
          <Plus size={18} />
        </IconButton>
        <IconButton label={`Edit ${account.name}`} onClick={onEdit}>
          <PencilSimple size={18} />
        </IconButton>
      </Card>
    </div>
  );
}

function ArchivedRow({ account }: { account: Account }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-ink-2">
        <AccountIcon type={account.type} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{account.name}</p>
        <p className="text-sm text-ink-2">
          Balance <Money value={account.balance} />
        </p>
      </div>
      <Link href={`/activity?account=${account.id}&month=all`} className={cn(buttonClass("ghost", "sm"), "hidden sm:inline-flex")}>
        <Receipt size={16} /> History
      </Link>
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setAccountActive(account.id, true);
            toast(result.message ?? "Done", { tone: result.ok ? "success" : "error" });
          })
        }
      >
        <ArrowCounterClockwise size={16} /> Restore
      </Button>
    </div>
  );
}

function AccountForm({ account, onDone }: { account?: Account; onDone: () => void }) {
  const toast = useToast();
  const { currency } = usePreferences();
  const [type, setType] = useState<AccountType>(account?.type ?? "debit");
  const [archiving, startArchive] = useTransition();
  const [confirmArchive, setConfirmArchive] = useState(false);

  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await saveAccount(prev, formData);
    if (result.ok) {
      toast(result.message ?? "Saved");
      onDone();
    }
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={submitWith(formAction)} className="space-y-6" noValidate>
      {account ? <input type="hidden" name="id" value={account.id} /> : null}
      <input type="hidden" name="type" value={type} />

      <fieldset>
        <legend className="mb-3 text-sm font-medium">Type</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {ACCOUNT_TYPES.map((option) => {
            const checked = type === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => setType(option.value)}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-[border-color,background-color,box-shadow] duration-200 sm:flex-col",
                  checked ? "border-accent bg-accent-soft ring-4 ring-accent-soft" : "border-line bg-surface-2 hover:border-line-strong",
                )}
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", checked ? "bg-accent text-accent-ink" : "bg-surface text-ink-2")}>
                  <AccountIcon type={option.value} size={20} />
                </span>
                <span>
                  <span className="block font-medium">{option.label}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-ink-2">{option.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field label="Name" htmlFor="account-name" error={errors.name} hint="Use the name on the card, so Apple Pay automations can match it.">
        <Input
          id="account-name"
          name="name"
          defaultValue={account?.name}
          placeholder={type === "cash" ? "Wallet" : type === "debit" ? "BBVA Debit" : "Visa Gold"}
          autoComplete="off"
          autoFocus
          aria-invalid={Boolean(errors.name)}
        />
      </Field>

      {!account ? (
        <Field
          label={type === "creditCard" ? "What you owe today" : "Balance today"}
          htmlFor="account-opening"
          optional
          error={errors.opening}
          hint={
            type === "creditCard"
              ? "Your current statement debt. Recorded as an opening expense on this card."
              : "Recorded as an opening entry, so the balance matches reality from day one."
          }
        >
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-2">{currencySymbol(currency)}</span>
            <Input id="account-opening" name="opening" inputMode="decimal" placeholder="0.00" className="pl-9 tabular" aria-invalid={Boolean(errors.opening)} />
          </div>
        </Field>
      ) : null}

      {state.message && !state.ok && !Object.keys(errors).length ? (
        <p role="alert" className="rounded-2xl bg-expense-soft px-4 py-3 text-sm text-expense">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {account ? (
          <Button
            type="button"
            variant={confirmArchive ? "danger" : "ghost"}
            size="lg"
            disabled={archiving}
            className={cn("sm:flex-1", !confirmArchive && "text-expense")}
            onClick={() => {
              if (!confirmArchive) return setConfirmArchive(true);
              startArchive(async () => {
                const result = await setAccountActive(account.id, false);
                toast(result.message ?? "Archived", { tone: result.ok ? "success" : "error" });
                if (result.ok) onDone();
              });
            }}
          >
            <Archive size={18} /> {confirmArchive ? "Tap again to archive" : "Archive"}
          </Button>
        ) : null}
        <Button type="submit" size="lg" disabled={pending} className="sm:flex-1">
          {pending ? "Saving…" : account ? "Save changes" : "Create account"}
        </Button>
      </div>
    </form>
  );
}
