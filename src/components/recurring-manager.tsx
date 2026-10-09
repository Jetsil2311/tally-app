"use client";

import {
  ArrowDown,
  ArrowDownLeft,
  ArrowUp,
  ArrowUpRight,
  CheckCircle,
  CreditCard,
  DotsThreeVertical,
  Lightning,
  Pause,
  PencilSimple,
  Play,
  Plus,
  Repeat,
  SkipForward,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { deleteRecurring, processDue, saveRecurring, setRecurringActive, skipRecurring } from "@/actions/recurring";
import { useI18n } from "@/i18n/client";
import type { Dictionary } from "@/i18n/dictionaries";
import { capitalize } from "@/i18n/format";
import { isSystemCategory } from "@/lib/insights";
import { toCents } from "@/lib/money";
import {
  FREQUENCIES,
  STATUS_TONE,
  dateOnly,
  daysUntil,
  formatDue,
  monthlyCents,
  relativeDue,
  scheduleLabel,
} from "@/lib/recurring";
import type {
  Account,
  ActionState,
  Category,
  Forecast,
  Occurrence,
  RecurringFrequency,
  RecurringPayment,
  TransactionType,
  Upcoming,
} from "@/lib/types";

import { AccountIcon } from "./account-icon";
import { ChipGroup, Segmented } from "./chips";
import { Menu, MenuItem } from "./menu";
import { Money } from "./preferences";
import { AmountInput } from "./quick-add";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, buttonClass, Card, cn, EmptyState, Field, Input, inputClass, SectionTitle, Select } from "./ui";
import { submitWith } from "./use-form-action";

// Starting points for the empty state, so the first one takes a tap.
// Names come from the dictionary.
const SUGGESTIONS: { key: keyof Dictionary["recurring"]["suggestions"]; type: TransactionType; frequency: RecurringFrequency }[] = [
  { key: "rent", type: "expense", frequency: "monthly" },
  { key: "salary", type: "income", frequency: "monthly" },
  { key: "phone", type: "expense", frequency: "monthly" },
  { key: "streaming", type: "expense", frequency: "monthly" },
  { key: "gym", type: "expense", frequency: "monthly" },
  { key: "insurance", type: "expense", frequency: "yearly" },
];

type Draft = Partial<Pick<RecurringPayment, "name" | "type" | "frequency">>;

export function RecurringManager({
  payments,
  upcoming,
  accounts,
  categories,
  today,
}: {
  payments: RecurringPayment[];
  upcoming: Upcoming;
  accounts: Account[];
  categories: Category[];
  // "2026-10-08" in the user's time zone
  today: string;
}) {
  const { t } = useI18n();
  const r = t.recurring;
  const [editing, setEditing] = useState<{ payment?: RecurringPayment; draft?: Draft; session: number } | null>(null);
  const [open, setOpen] = useState(false);
  const active = payments.filter((p) => p.isActive);
  const inactive = payments.filter((p) => !p.isActive);

  const start = (payment?: RecurringPayment, draft?: Draft) => {
    setEditing({ payment, draft, session: (editing?.session ?? 0) + 1 });
    setOpen(true);
  };

  return (
    <>
      <header className="rise flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight sm:text-[32px]">{t.nav.recurring}</h1>
          <p className="mt-1 max-w-[56ch] text-sm leading-relaxed text-ink-2">{r.intro}</p>
        </div>
        {active.length > 0 || inactive.length > 0 ? (
          <Button onClick={() => start()} className="w-full sm:w-auto">
            <Plus size={18} weight="bold" /> {r.newRecurring}
          </Button>
        ) : null}
      </header>

      {payments.length === 0 ? (
        <Card className="rise" style={{ "--i": 1 } as React.CSSProperties}>
          <EmptyState
            icon={<Repeat size={24} />}
            title={r.emptyTitle}
            action={<Button onClick={() => start()}>{r.addFirst}</Button>}
          >
            {r.emptyBody}
          </EmptyState>
          <div className="border-t border-line px-6 py-5">
            <p className="mb-3 text-center text-sm text-ink-2">{r.startFromCommon}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => start(undefined, { name: r.suggestions[s.key], type: s.type, frequency: s.frequency })}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface-2 px-4 text-[15px] transition-[border-color,transform] duration-200 hover:border-line-strong active:scale-[0.97]"
                >
                  {s.type === "income" ? (
                    <ArrowDownLeft size={16} weight="bold" className="text-income" />
                  ) : (
                    <ArrowUpRight size={16} weight="bold" className="text-ink-2" />
                  )}
                  {r.suggestions[s.key]}
                </button>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <>
          <OverdueBanner upcoming={upcoming} />

          <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
            <Card className="rise p-3 sm:p-4 lg:col-span-7" style={{ "--i": 1 } as React.CSSProperties} aria-labelledby="next-title">
              <div className="px-3 pt-2">
                <SectionTitle id="next-title">{r.next30}</SectionTitle>
              </div>
              <Timeline upcoming={upcoming} payments={active} today={today} onOpen={start} />
            </Card>

            <div className="flex flex-col gap-4 lg:col-span-5 lg:gap-5">
              <Commitments payments={active} />
              <Balances upcoming={upcoming} accounts={accounts} />
            </div>
          </div>

          {active.length > 0 ? (
            <section aria-labelledby="all-title" className="rise" style={{ "--i": 4 } as React.CSSProperties}>
              <SectionTitle id="all-title">{r.allRecurring}</SectionTitle>
              <Card className="divide-y divide-line p-0">
                {active.map((payment) => (
                  <PaymentRow key={payment.id} payment={payment} today={today} onEdit={() => start(payment)} />
                ))}
              </Card>
            </section>
          ) : null}

          {inactive.length > 0 ? (
            <section aria-labelledby="paused-title" className="rise pt-2" style={{ "--i": 5 } as React.CSSProperties}>
              <SectionTitle id="paused-title">{r.pausedAndFinished}</SectionTitle>
              <p className="-mt-2 mb-4 max-w-[60ch] text-sm text-ink-2">{r.pausedHint}</p>
              <Card className="divide-y divide-line p-0">
                {inactive.map((payment) => (
                  <PaymentRow key={payment.id} payment={payment} today={today} onEdit={() => start(payment)} />
                ))}
              </Card>
            </section>
          ) : null}
        </>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={editing?.payment ? r.editRecurring : r.newRecurring}
        description={editing?.payment ? undefined : r.sheetDescription}
      >
        {editing ? (
          <RecurringForm
            key={editing.session}
            payment={editing.payment}
            draft={editing.draft}
            accounts={accounts}
            categories={categories}
            today={today}
            onDone={() => setOpen(false)}
          />
        ) : null}
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

function OverdueBanner({ upcoming }: { upcoming: Upcoming }) {
  const toast = useToast();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const overdue = upcoming.occurrences.filter((o) => o.overdue);
  if (overdue.length === 0) return null;
  const missing = overdue.reduce((sum, o) => sum + toCents(o.shortfall), 0);

  return (
    <div
      role="status"
      className="rise flex flex-col gap-3 rounded-3xl border border-warn/25 bg-warn-soft px-5 py-4 sm:flex-row sm:items-center"
    >
      <WarningCircle size={22} weight="fill" className="hidden shrink-0 text-warn sm:block" />
      <p className="flex-1 text-[15px]">
        <span className="font-medium">{t.recurring.overdueTitle(overdue.length)}</span>{" "}
        <span className="text-ink-2">
          {missing > 0 ? t.recurring.overdueNeed(<Money cents={missing} className="font-medium text-ink" />) : null}
          {t.recurring.overdueHint}
        </span>
      </p>
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await processDue();
            toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
          })
        }
      >
        <Lightning size={16} weight="fill" /> {pending ? t.recurring.charging : t.recurring.chargeNow}
      </Button>
    </div>
  );
}

function groupLabel(dueDate: string, today: string, overdue: boolean, t: Dictionary, locale: string) {
  if (overdue) return t.recurring.overdue;
  const days = daysUntil(dueDate, today);
  if (days === 0 || days === 1) return `${days === 0 ? t.common.today : t.common.tomorrow}, ${formatDue(dueDate, locale)}`;
  return capitalize(
    new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(dueDate)),
  );
}

function Timeline({
  upcoming,
  payments,
  today,
  onOpen,
}: {
  upcoming: Upcoming;
  payments: RecurringPayment[];
  today: string;
  onOpen: (payment: RecurringPayment) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const { t, locale } = useI18n();
  const occurrences = upcoming.occurrences;
  const out = occurrences.filter((o) => o.type === "expense").reduce((sum, o) => sum + toCents(o.amount), 0);
  const inflow = occurrences.filter((o) => o.type === "income").reduce((sum, o) => sum + toCents(o.amount), 0);

  if (occurrences.length === 0) {
    return (
      <EmptyState icon={<CheckCircle size={24} />} title={t.recurring.nothingDue} className="py-8">
        {t.recurring.nothingDueHint}
      </EmptyState>
    );
  }

  const LIMIT = 8;
  const visible = showAll ? occurrences : occurrences.slice(0, LIMIT);
  const groups: { key: string; label: string; items: Occurrence[] }[] = [];
  for (const occurrence of visible) {
    const key = occurrence.overdue ? "overdue" : dateOnly(occurrence.dueDate);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label: groupLabel(occurrence.dueDate, today, occurrence.overdue, t, locale), items: [] };
      groups.push(group);
    }
    group.items.push(occurrence);
  }

  return (
    <div>
      <dl className="mx-3 mb-4 grid grid-cols-2 gap-4 rounded-2xl bg-surface-2 p-4">
        <div>
          <dt className="text-sm text-ink-2">{t.recurring.goingOut}</dt>
          <dd>
            <Money cents={out} className="text-2xl font-semibold tracking-tight" />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-2">{t.recurring.comingIn}</dt>
          <dd>
            <Money cents={inflow} className="text-2xl font-semibold tracking-tight text-income" />
          </dd>
        </div>
      </dl>

      <ol className="space-y-1">
        {groups.map((group) => (
          <li key={group.key}>
            <h3 className={cn("px-3 pt-3 pb-1 text-xs font-medium", group.key === "overdue" ? "text-warn" : "text-ink-2")}>{group.label}</h3>
            <ul>
              {group.items.map((occurrence, i) => {
                const payment = payments.find((p) => p.id === occurrence.recurringPaymentId);
                return (
                  <li key={`${occurrence.recurringPaymentId}-${occurrence.dueDate}-${i}`}>
                    <OccurrenceRow occurrence={occurrence} onClick={payment ? () => onOpen(payment) : undefined} />
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      {occurrences.length > LIMIT ? (
        <div className="px-3 pt-2 pb-1">
          <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
            {showAll ? t.common.showLess : t.common.showAll(occurrences.length)}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function OccurrenceRow({ occurrence, onClick }: { occurrence: Occurrence; onClick?: () => void }) {
  const income = occurrence.type === "income";
  const Row = onClick ? "button" : "div";
  return (
    <Row
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn("flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left", onClick && "transition-colors hover:bg-surface-2")}
    >
      <TypeBadge type={occurrence.type} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{occurrence.name}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-ink-2">
          <span className="truncate">{occurrence.account.name}</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <Money
          value={income ? occurrence.amount : -Number(occurrence.amount)}
          sign
          className={cn("text-[15px] font-semibold", income ? "text-income" : "text-ink")}
        />
        <StatusPill forecast={occurrence} />
      </span>
    </Row>
  );
}

// Fixed costs vs. recurring income, normalised to a month
function Commitments({ payments }: { payments: RecurringPayment[] }) {
  const { t } = useI18n();
  const r = t.recurring;
  const out = payments.filter((p) => p.type === "expense").reduce((sum, p) => sum + monthlyCents(p), 0);
  const inflow = payments.filter((p) => p.type === "income").reduce((sum, p) => sum + monthlyCents(p), 0);
  const left = inflow - out;

  return (
    <Card className="rise p-6" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="monthly-title">
      <SectionTitle id="monthly-title">{r.typicalMonth}</SectionTitle>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
        <div>
          <dt className="text-sm text-ink-2">{r.fixedCosts}</dt>
          <dd>
            <Money cents={out} className="text-2xl font-semibold tracking-tight" />
          </dd>
          <dd className="text-xs text-ink-2">
            {r.billCount(payments.filter((p) => p.type === "expense").length)}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-ink-2">{r.recurringIncome}</dt>
          <dd>
            <Money cents={inflow} className="text-2xl font-semibold tracking-tight text-income" />
          </dd>
        </div>
      </dl>
      {inflow > 0 ? (
        <p className="mt-5 border-t border-line pt-4 text-sm leading-relaxed text-ink-2">
          {left >= 0
            ? r.keepAfter(<Money cents={left} className="font-medium text-ink" />)
            : r.overspend(<Money cents={-left} className="font-medium text-expense" />)}
        </p>
      ) : (
        <p className="mt-5 border-t border-line pt-4 text-sm leading-relaxed text-ink-2">
          {r.averagedHint}
        </p>
      )}
    </Card>
  );
}

// Each account now vs. after everything in the window
function Balances({ upcoming, accounts }: { upcoming: Upcoming; accounts: Account[] }) {
  const { t } = useI18n();
  const r = t.recurring;
  if (upcoming.accounts.length === 0) return null;
  return (
    <Card className="rise p-6" style={{ "--i": 3 } as React.CSSProperties} aria-labelledby="balances-title">
      <SectionTitle id="balances-title">{r.balancesIn30}</SectionTitle>
      <ul className="space-y-4">
        {upcoming.accounts.map((row) => {
          const type = accounts.find((a) => a.id === row.id)?.type ?? "debit";
          const now = toCents(row.currentBalance);
          const later = toCents(row.projectedBalance);
          const short = toCents(row.shortfall);
          return (
            <li key={row.id} className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2" aria-hidden>
                <AccountIcon type={type} size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{row.name}</p>
                <p className="text-sm text-ink-2">{r.now(<Money cents={now} />)}</p>
                {short > 0 ? (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-warn">
                    <WarningCircle size={16} weight="fill" /> {r.needsMore(<Money cents={short} />)}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <Money cents={later} className={cn("text-[15px] font-semibold", later < 0 && type !== "creditCard" ? "text-expense" : "text-ink")} />
                <p className="text-xs text-ink-2">{r.after(<Money cents={later - now} sign />)}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-3">
        {r.onlyRecurring}
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export function TypeBadge({ type, paused }: { type: TransactionType; paused?: boolean }) {
  const Icon = type === "income" ? ArrowDownLeft : ArrowUpRight;
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full",
        paused ? "bg-surface-2 text-ink-3" : type === "income" ? "bg-income-soft text-income" : "bg-surface-3 text-ink-2",
      )}
    >
      <Icon size={18} weight="bold" />
    </span>
  );
}

export function StatusPill({ forecast }: { forecast: Forecast }) {
  const { t } = useI18n();
  const tone = STATUS_TONE[forecast.status];
  const short = forecast.status === "insufficient";
  const icon =
    forecast.status === "covered" ? (
      <CheckCircle size={14} weight="fill" />
    ) : short ? (
      <WarningCircle size={14} weight="fill" />
    ) : forecast.status === "income" ? (
      <ArrowDown size={14} weight="bold" />
    ) : forecast.status === "noCheck" ? (
      <CreditCard size={14} />
    ) : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "ok" && "bg-surface-2 text-ink-2 [&>svg]:text-income",
        tone === "warn" && "bg-warn-soft text-warn",
        tone === "income" && "bg-income-soft text-income",
        tone === "muted" && "bg-surface-2 text-ink-2",
      )}
    >
      {icon}
      {short ? t.recurring.short(<Money value={forecast.shortfall} />, forecast.overdue) : t.recurring.status[forecast.status]}
    </span>
  );
}

function PaymentRow({ payment, today, onEdit }: { payment: RecurringPayment; today: string; onEdit: () => void }) {
  const toast = useToast();
  const { t, locale } = useI18n();
  const r = t.recurring;
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const income = payment.type === "income";
  const finished = !payment.isActive && payment.endDate !== null && payment.nextDueDate > payment.endDate;

  const run = (action: () => Promise<ActionState>) =>
    startTransition(async () => {
      const result = await action();
      toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
    });

  return (
    <div className={cn("flex items-center gap-1 py-1 pr-2 pl-1 transition-opacity", pending && "opacity-60")}>
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-3.5 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2 sm:gap-4"
      >
        <TypeBadge type={payment.type} paused={!payment.isActive} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{payment.name}</span>
          <span className="mt-0.5 block truncate text-sm text-ink-2">
            {scheduleLabel(payment, r, locale)}
            <span className="text-ink-3"> · {payment.account.name}</span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <Money
            value={income ? payment.amount : -Number(payment.amount)}
            sign
            className={cn("text-[15px] font-semibold", !payment.isActive ? "text-ink-2" : income ? "text-income" : "text-ink")}
          />
          <span className="text-xs text-ink-2">
            {payment.isActive ? (
              relativeDue(payment.nextDueDate, today, t, locale)
            ) : finished ? (
              r.finished
            ) : (
              <span className="inline-flex items-center gap-1">
                <Pause size={12} weight="fill" /> {r.paused}
              </span>
            )}
          </span>
        </span>
      </button>

      {payment.isActive && payment.next ? (
        <span className="hidden w-36 shrink-0 justify-end md:flex">
          <StatusPill forecast={payment.next} />
        </span>
      ) : null}

      {payment.isActive ? (
        <Menu
          label={r.actionsFor(payment.name)}
          trigger={() => (
            <span className="flex size-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
              <DotsThreeVertical size={20} weight="bold" />
            </span>
          )}
        >
          {(close) => (
            <>
              <MenuItem icon={<PencilSimple size={18} />} onClick={() => (close(), onEdit())}>
                {r.edit}
              </MenuItem>
              <MenuItem icon={<SkipForward size={18} />} onClick={() => (close(), run(() => skipRecurring(payment.id)))}>
                {r.skip(formatDue(payment.nextDueDate, locale))}
              </MenuItem>
              <MenuItem icon={<Pause size={18} />} onClick={() => (close(), run(() => setRecurringActive(payment.id, false)))}>
                {r.pause}
              </MenuItem>
              <div className="mt-1.5 border-t border-line pt-1.5">
                <MenuItem
                  icon={<Trash size={18} className="text-expense" />}
                  className="text-expense hover:bg-expense-soft"
                  onClick={() => {
                    if (!confirmDelete) return setConfirmDelete(true);
                    close();
                    setConfirmDelete(false);
                    run(() => deleteRecurring(payment.id));
                  }}
                >
                  {confirmDelete ? t.common.tapAgainToDelete : t.common.delete}
                </MenuItem>
              </div>
            </>
          )}
        </Menu>
      ) : finished ? null : (
        <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => setRecurringActive(payment.id, true))}>
          <Play size={14} weight="fill" /> {r.resume}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

function RecurringForm({
  payment,
  draft,
  accounts,
  categories,
  today,
  onDone,
}: {
  payment?: RecurringPayment;
  draft?: Draft;
  accounts: Account[];
  categories: Category[];
  today: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const { t, locale } = useI18n();
  const r = t.recurring;
  const [type, setType] = useState<TransactionType>(payment?.type ?? draft?.type ?? "expense");
  const [frequency, setFrequency] = useState<RecurringFrequency>(payment?.frequency ?? draft?.frequency ?? "monthly");
  const [every, setEvery] = useState(String(payment?.interval ?? 1));
  const [startDate, setStartDate] = useState(payment ? dateOnly(payment.startDate) : today);
  const [hasEnd, setHasEnd] = useState(Boolean(payment?.endDate));

  const activeAccounts = accounts.filter((a) => a.isActive || a.id === payment?.accountId);
  const [accountId, setAccountId] = useState(
    payment?.accountId ?? activeAccounts.find((a) => a.type !== "creditCard")?.id ?? activeAccounts[0]?.id ?? "",
  );
  const account = activeAccounts.find((a) => a.id === accountId);

  const usable = categories.filter((c) => !isSystemCategory(c.name));
  const topLevel = usable.filter((c) => !c.parentId);

  const [deleting, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await saveRecurring(prev, formData);
    if (result.ok) {
      toast(result.message ?? t.common.saved);
      onDone();
    }
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};

  if (activeAccounts.length === 0) {
    return (
      <div className="pb-4 text-center">
        <p className="text-ink-2">{r.addAccountFirst}</p>
        <Link href="/accounts?new=1" onClick={onDone} className={cn(buttonClass("primary"), "mt-5")}>
          {t.quickAdd.createAccount}
        </Link>
      </div>
    );
  }

  const n = Number(every);
  const validInterval = Number.isInteger(n) && n >= 1 && n <= 52;
  const preview = /^\d{4}-\d{2}-\d{2}$/.test(startDate)
    ? scheduleLabel({ frequency, interval: validInterval ? n : 1, startDate: `${startDate}T00:00:00.000Z` }, r, locale)
    : null;
  const inPast = !payment && startDate < today;

  return (
    <form onSubmit={submitWith(formAction)} className="space-y-6" noValidate>
      {payment ? (
        <>
          <input type="hidden" name="id" value={payment.id} />
          <input type="hidden" name="originalFrequency" value={payment.frequency} />
          <input type="hidden" name="originalInterval" value={payment.interval} />
          <input type="hidden" name="originalStartDate" value={dateOnly(payment.startDate)} />
          <input type="hidden" name="originalEndDate" value={payment.endDate ? dateOnly(payment.endDate) : ""} />
        </>
      ) : null}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="frequency" value={frequency} />

      <Segmented
        label={t.common.type}
        value={type}
        onChange={setType}
        className="w-full"
        options={[
          { value: "expense", label: t.common.expense, icon: <ArrowUp size={16} weight="bold" /> },
          { value: "income", label: t.common.income, icon: <ArrowDown size={16} weight="bold" /> },
        ]}
      />

      <AmountInput defaultValue={payment?.amount} error={errors.amount} result={state} tone={type} />

      <Field label={t.common.name} htmlFor="recurring-name" error={errors.name} hint={r.nameHint}>
        <Input
          id="recurring-name"
          name="name"
          defaultValue={payment?.name ?? draft?.name}
          placeholder={type === "income" ? r.namePlaceholderIncome : r.namePlaceholderExpense}
          maxLength={100}
          autoComplete="off"
          aria-invalid={Boolean(errors.name)}
        />
      </Field>

      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-medium">{r.repeats}</legend>
        <Segmented
          label={r.frequencyLabel}
          value={frequency}
          onChange={setFrequency}
          className="w-full"
          options={FREQUENCIES.map((f) => ({ value: f, label: r.frequency[f] }))}
        />
        <div className="flex items-center gap-3 text-[15px]">
          <label htmlFor="recurring-interval" className="text-ink-2">
            {r.everyLabel}
          </label>
          <input
            id="recurring-interval"
            name="interval"
            type="number"
            inputMode="numeric"
            min={1}
            max={52}
            value={every}
            onChange={(e) => setEvery(e.target.value)}
            aria-invalid={Boolean(errors.interval) || !validInterval}
            aria-describedby="recurring-interval-message"
            className={cn(inputClass, "tabular h-11 w-20 text-center")}
          />
          <span className="text-ink-2">{r.unit(frequency, validInterval ? n : 1)}</span>
        </div>
        <p id="recurring-interval-message" className={cn("text-sm", errors.interval ? "text-expense" : "text-ink-2")} role={errors.interval ? "alert" : undefined}>
          {errors.interval ?? r.intervalHint[frequency]}
        </p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={payment ? r.firstDueDate : r.nextDueDate} htmlFor="recurring-start" error={errors.startDate}>
          <input
            id="recurring-start"
            name="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            aria-invalid={Boolean(errors.startDate)}
            className={inputClass}
          />
        </Field>
        <Field
          label={r.lastDate}
          htmlFor="recurring-end"
          optional
          error={errors.endDate}
          hint={
            hasEnd ? (
              <button type="button" onClick={() => setHasEnd(false)} className="underline-offset-4 hover:text-ink hover:underline">
                {r.removeLastDate}
              </button>
            ) : undefined
          }
        >
          {hasEnd ? (
            <input
              // Revealed by a tap on "Never ends", so focus follows it
              autoFocus={!payment?.endDate}
              id="recurring-end"
              name="endDate"
              type="date"
              min={startDate}
              defaultValue={payment?.endDate ? dateOnly(payment.endDate) : ""}
              aria-invalid={Boolean(errors.endDate)}
              className={inputClass}
            />
          ) : (
            <button
              type="button"
              id="recurring-end"
              onClick={() => setHasEnd(true)}
              className={cn(inputClass, "flex items-center text-left text-ink-3")}
            >
              {r.neverEnds}
            </button>
          )}
        </Field>
      </div>

      {preview ? (
        <p className="flex items-start gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-sm leading-relaxed">
          <Repeat size={18} className="mt-0.5 shrink-0 text-accent" />
          <span>
            <span className="font-medium">{preview}</span>
            <span className="text-ink-2">
              {inPast
                ? r.previewPast
                : payment
                  ? r.previewNext(formatDue(payment.nextDueDate, locale))
                  : r.previewStart(formatDue(`${startDate}T00:00:00.000Z`, locale, "long"))}
            </span>
          </span>
        </p>
      ) : null}

      <fieldset className="space-y-3">
        <legend className="mb-3 text-sm font-medium">{type === "income" ? r.paidInto : r.paidFrom}</legend>
        <ChipGroup
          label={t.common.account}
          name="accountId"
          value={accountId}
          onChange={setAccountId}
          invalid={Boolean(errors.accountId)}
          options={activeAccounts.map((a) => ({ value: a.id, label: a.name, icon: <AccountIcon type={a.type} size={18} /> }))}
        />
        {errors.accountId ? (
          <p role="alert" className="text-sm text-expense">
            {errors.accountId}
          </p>
        ) : type === "expense" && account?.type === "creditCard" ? (
          <p className="text-sm text-ink-2">{r.creditHint}</p>
        ) : type === "expense" ? (
          <p className="text-sm text-ink-2">{r.shortHint}</p>
        ) : null}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.common.category} htmlFor="recurring-category" optional error={errors.categoryId}>
          <Select id="recurring-category" name="categoryId" defaultValue={payment?.categoryId ?? ""}>
            <option value="">{t.common.none}</option>
            {topLevel.map((parent) => {
              const children = usable.filter((c) => c.parentId === parent.id);
              return children.length ? (
                <optgroup key={parent.id} label={parent.name}>
                  <option value={parent.id}>{parent.name}</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              );
            })}
          </Select>
        </Field>
        <Field label={r.detailsLabel} htmlFor="recurring-description" optional error={errors.description}>
          <Input
            id="recurring-description"
            name="description"
            defaultValue={payment?.description ?? ""}
            placeholder={r.detailsPlaceholder}
            maxLength={500}
            autoComplete="off"
          />
        </Field>
      </div>

      {state.message && !state.ok && !Object.keys(errors).length ? (
        <p role="alert" className="rounded-2xl bg-expense-soft px-4 py-3 text-sm text-expense">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {payment ? (
          <Button
            type="button"
            variant={confirmDelete ? "danger" : "ghost"}
            size="lg"
            disabled={deleting}
            className={cn("sm:flex-1", !confirmDelete && "text-expense")}
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              startDelete(async () => {
                const result = await deleteRecurring(payment.id);
                toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
                if (result.ok) onDone();
              });
            }}
          >
            <Trash size={18} /> {deleting ? t.common.deleting : confirmDelete ? t.common.tapAgainToDelete : t.common.delete}
          </Button>
        ) : null}
        <Button type="submit" size="lg" disabled={pending} className="sm:flex-1">
          {pending ? t.common.saving : payment ? t.common.saveChanges : type === "income" ? r.addRecurringIncome : r.addRecurringPayment}
        </Button>
      </div>
    </form>
  );
}
