"use client";

import { ArrowRight, Broom, CalendarBlank, Check, CheckCircle, Clock, CreditCard, Plus, Scales, Trash, X } from "@phosphor-icons/react";
import { useActionState, useState, useTransition } from "react";

import { choreAction, createChore } from "@/actions/chores";
import { useI18n } from "@/i18n/client";
import { toCents } from "@/lib/money";
import { canManage } from "@/lib/permissions";
import type { Account, ActionState, CardCycle, Chore, Member, Settlement } from "@/lib/types";

import { Avatar, displayName, useViewer } from "./people-ui";
import { Money } from "./preferences";
import { AmountInput } from "./quick-add";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, Card, cn, Field, Input } from "./ui";
import { submitWith } from "./use-form-action";

// The extra cards on an account's page, each shown only where it applies:
// a credit card's statement, who owes whom on a shared account, and chores.

// ---------------------------------------------------------------------------
// Credit card: what to pay, by when, and how much of the limit is used
// ---------------------------------------------------------------------------

export function CardCycleCard({ cycle, account }: { cycle: CardCycle; account: Account }) {
  const { t, locale } = useI18n();
  const c = t.accounts.cycle;
  const toPay = toCents(cycle.balanceToPay);
  const paid = toPay <= 0;
  const days = cycle.daysUntilDue;
  const tone = paid ? "ok" : days < 0 ? "late" : days <= 5 ? "soon" : "calm";
  const due = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(cycle.paymentDueDate));
  const owed = Math.max(-toCents(account.balance), 0);
  const limit = cycle.creditLimit ? toCents(cycle.creditLimit) : 0;
  const used = limit > 0 ? Math.min(owed / limit, 1) : null;

  return (
    <Card className="rise p-5 sm:p-6" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="cycle-title">
      <h2 id="cycle-title" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
        <CreditCard size={20} className="text-accent" aria-hidden /> {c.toPay}
      </h2>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <Money cents={Math.max(toPay, 0)} currency={cycle.currency} className="text-[32px] leading-none font-semibold tracking-tight" />
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
            tone === "ok" && "bg-income-soft text-income",
            tone === "late" && "bg-expense-soft text-expense",
            tone === "soon" && "bg-warn-soft text-warn",
            tone === "calm" && "bg-surface-2 text-ink-2",
          )}
        >
          {paid ? <CheckCircle size={16} weight="fill" aria-hidden /> : <CalendarBlank size={16} weight="fill" aria-hidden />}
          {paid ? c.paid : days < 0 ? c.late(due, -days) : days === 0 ? c.today(due) : c.dueIn(due, days)}
        </span>
      </div>

      {used !== null ? (
        <div className="mt-5">
          <div
            role="progressbar"
            aria-label={c.used}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(used * 100)}
            className="h-2.5 overflow-hidden rounded-full bg-surface-3"
          >
            <span
              className={cn("block h-full rounded-full", used >= 0.9 ? "bg-expense" : used >= 0.7 ? "bg-warn" : "bg-accent")}
              style={{ width: `${Math.max(used * 100, owed ? 3 : 0)}%` }}
            />
          </div>
          <p className="mt-2 flex justify-between gap-3 text-sm text-ink-2">
            <span>
              {c.used} <Money cents={owed} currency={cycle.currency} className="font-medium text-ink" />
            </span>
            <span>
              {c.limit} <Money cents={limit} currency={cycle.currency} />
            </span>
          </p>
        </div>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Shared account: who owes whom this month
// ---------------------------------------------------------------------------

export function SettleUpCard({ settlement, members, month }: { settlement: Settlement; members: Member[]; month: string }) {
  const { t } = useI18n();
  const viewer = useViewer();
  const s = t.settle;
  const person = (id: string, name: string | null) => {
    const member = members.find((m) => m.userId === id);
    return member?.user ?? { id, name, imageUrl: null };
  };
  const label = (id: string, name: string | null) => (id === viewer.id ? t.nav.you : displayName(person(id, name), t.people.someone));
  const even = settlement.transfers.length === 0;

  return (
    <Card className="rise p-5 sm:p-6" style={{ "--i": 4 } as React.CSSProperties} aria-labelledby="settle-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="settle-title" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
          <Scales size={20} className="text-accent" aria-hidden /> {s.title}
        </h2>
        <span className="text-sm text-ink-3">{month}</span>
      </div>

      {even ? (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-income-soft px-4 py-3 text-[15px] font-medium text-income">
          <CheckCircle size={20} weight="fill" aria-hidden /> {s.even}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {settlement.transfers.map((transfer, i) => {
            const mine = transfer.fromUserId === viewer.id || transfer.toUserId === viewer.id;
            return (
              <li
                key={i}
                className={cn("flex items-center gap-3 rounded-2xl px-3 py-3", mine ? "bg-accent-soft" : "bg-surface-2")}
              >
                <span className="flex shrink-0 items-center gap-1.5">
                  <Avatar person={person(transfer.fromUserId, transfer.fromName)} size={32} />
                  <ArrowRight size={16} weight="bold" className="text-ink-3" aria-hidden />
                  <Avatar person={person(transfer.toUserId, transfer.toName)} size={32} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {s.owes(label(transfer.fromUserId, transfer.fromName), label(transfer.toUserId, transfer.toName))}
                </span>
                <Money value={transfer.amount} currency={settlement.currency} className="shrink-0 text-[17px] font-semibold" />
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-3 text-sm text-ink-2">
        {s.shared} <Money value={settlement.totalShared} currency={settlement.currency} className="font-medium text-ink" />
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Chores (allowance mode)
// ---------------------------------------------------------------------------

export function ChoresCard({ account, chores, members }: { account: Account; chores: Chore[]; members: Member[] }) {
  const { t } = useI18n();
  const viewer = useViewer();
  const manages = canManage(account.myRole);
  const [adding, setAdding] = useState(false);
  const [session, setSession] = useState(0);
  // Who can be given chores: active members who take part in spending
  const people = members.filter((m) => m.status === "active" && m.role !== "viewer");
  // Waiting for review first, then to do, then finished
  const order = { done: 0, pending: 1, approved: 2, rejected: 3 } as const;
  const sorted = [...chores].sort((a, b) => order[a.status] - order[b.status]);
  // Nothing to show to someone who can't add any
  if (!chores.length && !manages) return null;

  return (
    <Card className="rise p-3 sm:p-4" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="chores-title">
      <div className="flex items-center justify-between gap-3 px-3 pt-2 pb-2">
        <h2 id="chores-title" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
          <Broom size={20} className="text-accent" aria-hidden /> {t.chores.title}
        </h2>
        {manages && people.length ? (
          <Button
            size="sm"
            onClick={() => {
              setSession((n) => n + 1);
              setAdding(true);
            }}
          >
            <Plus size={16} weight="bold" /> {t.chores.add}
          </Button>
        ) : null}
      </div>

      {sorted.length ? (
        <ul>
          {sorted.map((chore) => (
            <ChoreRow key={chore.id} chore={chore} manages={manages} mine={chore.assignedToId === viewer.id} members={members} account={account} />
          ))}
        </ul>
      ) : (
        <button
          type="button"
          onClick={() => {
            setSession((n) => n + 1);
            setAdding(true);
          }}
          className="mx-1 mb-1 flex w-[calc(100%-0.5rem)] items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong px-4 py-5 text-[15px] font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent"
        >
          <Plus size={18} weight="bold" aria-hidden /> {t.chores.add}
        </button>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title={t.chores.add}>
        <ChoreForm key={session} account={account} people={people} onDone={() => setAdding(false)} />
      </Sheet>
    </Card>
  );
}

function ChoreRow({ chore, manages, mine, members, account }: { chore: Chore; manages: boolean; mine: boolean; members: Member[]; account: Account }) {
  const { t } = useI18n();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const person = members.find((m) => m.userId === chore.assignedToId)?.user ?? { ...chore.assignedTo, imageUrl: null };
  const finished = chore.status === "approved" || chore.status === "rejected";
  const run = (action: Parameters<typeof choreAction>[1]) =>
    startTransition(async () => {
      const result = await choreAction(chore.id, action);
      toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
    });

  return (
    <li className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5", pending && "opacity-60", finished && "opacity-70")}>
      {/* The check: tick your own to say it's done */}
      {chore.status === "pending" && (mine || manages) ? (
        <button
          type="button"
          onClick={() => run("complete")}
          disabled={pending}
          aria-label={t.chores.markDone(chore.title)}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-line-strong text-transparent transition-colors hover:border-income hover:text-income"
        >
          <Check size={16} weight="bold" aria-hidden />
        </button>
      ) : (
        <span
          aria-hidden
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            chore.status === "done" && "bg-warn-soft text-warn",
            chore.status === "approved" && "bg-income text-surface",
            chore.status === "rejected" && "bg-expense-soft text-expense",
            chore.status === "pending" && "border-2 border-line",
          )}
        >
          {chore.status === "done" ? <Clock size={16} weight="bold" /> : chore.status === "approved" ? <Check size={16} weight="bold" /> : chore.status === "rejected" ? <X size={16} weight="bold" /> : null}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[15px] font-medium", chore.status === "rejected" && "line-through")}>{chore.title}</span>
        <span className="flex items-center gap-1.5 text-sm text-ink-2">
          <Avatar person={person} size={18} />
          <span className="truncate">{mine ? t.nav.you : displayName(person, t.people.someone)}</span>
          <span className="sr-only">· {t.chores.status[chore.status]}</span>
        </span>
      </span>

      <Money value={chore.reward} currency={account.currency} sign className={cn("shrink-0 font-semibold", chore.status === "approved" ? "text-income" : "text-ink-2")} />

      {/* Review: approve pays the reward */}
      {chore.status === "done" && manages ? (
        <span className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => run("approve")}
            disabled={pending}
            aria-label={t.chores.approve(chore.title)}
            title={t.chores.approve(chore.title)}
            className="flex size-9 items-center justify-center rounded-full bg-income text-surface transition-transform active:scale-95"
          >
            <Check size={16} weight="bold" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => run("reject")}
            disabled={pending}
            aria-label={t.chores.reject(chore.title)}
            title={t.chores.reject(chore.title)}
            className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-ink-2 transition-colors hover:bg-expense-soft hover:text-expense"
          >
            <X size={16} weight="bold" aria-hidden />
          </button>
        </span>
      ) : manages && chore.status !== "done" ? (
        <button
          type="button"
          onClick={() => run("delete")}
          disabled={pending}
          aria-label={t.chores.remove(chore.title)}
          title={t.chores.remove(chore.title)}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-expense-soft hover:text-expense"
        >
          <Trash size={16} aria-hidden />
        </button>
      ) : null}
    </li>
  );
}

function ChoreForm({ account, people, onDone }: { account: Account; people: Member[]; onDone: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const viewer = useViewer();
  // Dependents first: allowance mode is mostly for them
  const sortedPeople = [...people].sort((a, b) => Number(b.role === "dependent") - Number(a.role === "dependent"));
  const [who, setWho] = useState(sortedPeople[0]?.userId ?? "");
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createChore(prev, formData);
    if (result.ok) {
      toast(result.message ?? t.common.saved, { tone: "success" });
      onDone();
    }
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={submitWith(formAction)} className="space-y-6" noValidate>
      <input type="hidden" name="accountId" value={account.id} />
      <input type="hidden" name="assignedToId" value={who} />
      <AmountInput error={errors.amount} result={state} tone="income" currency={account.currency} />
      <Field label={t.chores.what} htmlFor="chore-title" error={errors.title}>
        <Input id="chore-title" name="title" maxLength={120} autoComplete="off" placeholder={t.chores.placeholder} aria-invalid={Boolean(errors.title)} />
      </Field>
      <fieldset>
        <legend className="mb-3 text-sm font-medium">{t.chores.who}</legend>
        <div role="radiogroup" aria-label={t.chores.who} className="flex flex-wrap gap-2">
          {sortedPeople.map((member) => {
            const checked = member.userId === who;
            return (
              <button
                key={member.userId}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => setWho(member.userId)}
                className={cn(
                  "inline-flex min-h-12 items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-[15px] transition-colors",
                  checked ? "border-ink bg-ink text-surface" : "border-line bg-surface-2 hover:border-line-strong",
                )}
              >
                <Avatar person={member.user} size={32} />
                <span className="max-w-40 truncate">{member.userId === viewer.id ? t.nav.you : displayName(member.user, t.people.someone)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      {state.message && !state.ok && !Object.keys(errors).length ? (
        <p role="alert" className="rounded-2xl bg-expense-soft px-4 py-3 text-sm text-expense">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? t.common.saving : t.chores.add}
      </Button>
    </form>
  );
}
