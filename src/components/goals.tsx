"use client";

import {
  Airplane,
  ArrowRight,
  ArrowCounterClockwise,
  Archive,
  ArrowDown,
  ArrowUp,
  Car,
  Confetti,
  DeviceMobile,
  Diamond,
  Gift,
  GraduationCap,
  Guitar,
  Heartbeat,
  House,
  Laptop,
  Lifebuoy,
  PawPrint,
  PencilSimple,
  PiggyBank,
  Plus,
  Target,
  Trash,
  Umbrella,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";

import { addContribution, deleteGoal, loadContributions, saveGoal, setGoalStatus } from "@/actions/goals";
import { useI18n } from "@/i18n/client";
import { toCents } from "@/lib/money";
import type { ActionState, GoalContribution, SavingsGoal } from "@/lib/types";

import { Segmented } from "./chips";
import { Money, usePreferences } from "./preferences";
import { AmountInput } from "./quick-add";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, Card, cn, EmptyState, Field, Input } from "./ui";
import { submitWith } from "./use-form-action";

// Savings goals: a digital piggy bank. A target, and amounts the user says
// they set aside toward it. Nothing moves between accounts.

type Panel = { kind: "new" } | { kind: "edit"; goal: SavingsGoal } | { kind: "detail"; goal: SavingsGoal; mode?: "deposit" | "withdraw" };

// A goal's icon, picked from these. The API keeps it as a short text
// (≤ 8 characters), so the key is stored, never an emoji; anything else
// (e.g. an emoji set by another client) shows the default target icon.
const GOAL_ICONS: Record<string, PhosphorIcon> = {
  beach: Umbrella,
  plane: Airplane,
  home: House,
  car: Car,
  school: GraduationCap,
  laptop: Laptop,
  phone: DeviceMobile,
  music: Guitar,
  gift: Gift,
  ring: Diamond,
  pet: PawPrint,
  health: Heartbeat,
  safety: Lifebuoy,
  piggy: PiggyBank,
};

export function GoalsManager({ goals, openNew, openGoalId }: { goals: SavingsGoal[]; openNew?: boolean; openGoalId?: string }) {
  const { t } = useI18n();
  // Deep links: /goals?new=1, or /goals?goal=<id> from Home
  const linked = openGoalId ? goals.find((g) => g.id === openGoalId) : undefined;
  const [panel, setPanel] = useState<Panel | null>(
    openNew ? { kind: "new" } : linked ? { kind: "detail", goal: linked } : null,
  );
  const [isOpen, setOpen] = useState(Boolean(panel));
  // Bumped on every opening: the sheet's content starts fresh each time
  const [session, setSession] = useState(0);
  const open = (next: Panel) => {
    setPanel(next);
    setSession((n) => n + 1);
    setOpen(true);
  };
  // The content stays while the sheet animates out
  const close = () => setOpen(false);

  const active = goals.filter((g) => g.status === "active");
  const reached = goals.filter((g) => g.status === "completed");
  const paused = goals.filter((g) => g.status === "archived");
  // The open goal, kept current after a deposit refreshes the list
  const current = panel && (panel.kind === "detail" || panel.kind === "edit") ? (goals.find((g) => g.id === panel.goal.id) ?? panel.goal) : null;

  return (
    <>
      <header className="rise flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight sm:text-[32px]">{t.goals.title}</h1>
          <p className="mt-1 max-w-[56ch] text-sm leading-relaxed text-ink-2">{t.goals.intro}</p>
        </div>
        {goals.length ? (
          <Button onClick={() => open({ kind: "new" })} className="w-full sm:w-auto">
            <Plus size={18} weight="bold" /> {t.goals.newGoal}
          </Button>
        ) : null}
      </header>

      {goals.length === 0 ? (
        <Card className="rise p-6">
          <EmptyState
            icon={<PiggyBank size={26} />}
            title={t.goals.emptyTitle}
            action={
              <Button onClick={() => open({ kind: "new" })}>
                <Plus size={18} weight="bold" /> {t.goals.newGoal}
              </Button>
            }
          >
            {t.goals.emptyHint}
          </EmptyState>
        </Card>
      ) : null}

      {active.length ? (
        <section aria-labelledby="goals-active" className="space-y-3">
          <h2 id="goals-active" className="sr-only">
            {t.goals.active}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((goal, i) => (
              <GoalCard key={goal.id} goal={goal} index={i} onOpen={(mode) => open({ kind: "detail", goal, mode })} />
            ))}
          </div>
        </section>
      ) : null}

      {reached.length ? (
        <section aria-labelledby="goals-reached" className="space-y-3">
          <h2 id="goals-reached" className="text-[17px] font-semibold tracking-tight">
            {t.goals.reachedTitle} <span className="tabular font-normal text-ink-3">· {reached.length}</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reached.map((goal, i) => (
              <GoalCard key={goal.id} goal={goal} index={i} onOpen={(mode) => open({ kind: "detail", goal, mode })} />
            ))}
          </div>
        </section>
      ) : null}

      {paused.length ? (
        <section aria-labelledby="goals-paused" className="space-y-3">
          <h2 id="goals-paused" className="text-[17px] font-semibold tracking-tight">
            {t.goals.pausedTitle} <span className="tabular font-normal text-ink-3">· {paused.length}</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paused.map((goal, i) => (
              <GoalCard key={goal.id} goal={goal} index={i} onOpen={() => open({ kind: "detail", goal })} />
            ))}
          </div>
        </section>
      ) : null}

      <Sheet
        open={isOpen}
        onClose={close}
        title={
          panel?.kind === "new" ? t.goals.newGoal : panel?.kind === "edit" ? t.goals.editGoal : current ? current.name : t.goals.title
        }
      >
        {panel?.kind === "new" ? <GoalForm key={session} onDone={close} /> : null}
        {panel?.kind === "edit" && current ? <GoalForm key={session} goal={current} onDone={() => open({ kind: "detail", goal: current })} /> : null}
        {panel?.kind === "detail" && current ? (
          <GoalDetail
            key={session}
            goal={current}
            initialMode={panel.mode}
            onEdit={() => open({ kind: "edit", goal: current })}
            onClose={close}
          />
        ) : null}
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

function GoalCard({ goal, index, onOpen }: { goal: SavingsGoal; index: number; onOpen: (mode?: "deposit") => void }) {
  const { t } = useI18n();
  const left = Math.max(toCents(goal.targetAmount) - toCents(goal.saved), 0);
  const done = goal.status === "completed";
  const paused = goal.status === "archived";
  return (
    <article
      className={cn(
        "rise group relative flex flex-col gap-4 rounded-3xl border bg-surface p-5 transition-[border-color,box-shadow] hover:border-line-strong",
        done ? "border-income/30" : "border-line",
        paused && "opacity-75",
      )}
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="flex items-start gap-3">
        <GoalIcon icon={goal.icon} done={done} />
        <div className="min-w-0 flex-1">
          {/* The whole card opens the goal; the name is its accessible label */}
          <h3 className="truncate text-[17px] font-semibold tracking-tight">
            <button type="button" onClick={() => onOpen()} className="text-left after:absolute after:inset-0 after:rounded-3xl">
              {goal.name}
            </button>
          </h3>
          <p className="mt-0.5 text-sm text-ink-2">
            {done ? (
              <span className="inline-flex items-center gap-1 font-medium text-income">
                <Confetti size={14} weight="fill" aria-hidden /> {t.goals.reachedLabel}
              </span>
            ) : paused ? (
              t.goals.pausedLabel
            ) : (
              t.goals.leftToGo(<Money cents={left} currency={goal.currency} className="font-medium text-ink" />)
            )}
          </p>
        </div>
      </div>

      <div>
        <p className="flex items-baseline justify-between gap-3">
          <Money value={goal.saved} currency={goal.currency} className="truncate text-2xl font-semibold tracking-tight" />
          <span className="shrink-0 text-sm text-ink-2">
            {t.goals.of} <Money value={goal.targetAmount} currency={goal.currency} />
          </span>
        </p>
        <GoalMeter goal={goal} className="mt-3" />
      </div>

      {!paused ? (
        <div className="relative z-10 -mb-1 flex items-center justify-between gap-3">
          <span className="tabular text-sm font-medium text-ink-2">{t.goals.percent(goal.progress)}</span>
          <button
            type="button"
            onClick={() => onOpen("deposit")}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent-soft px-3.5 text-sm font-medium text-accent transition-[background-color,transform] hover:bg-accent hover:text-accent-ink active:scale-[0.97]"
          >
            <Plus size={15} weight="bold" aria-hidden /> {t.goals.addMoney}
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function GoalIcon({ icon, done, size = "md" }: { icon: string | null; done?: boolean; size?: "md" | "lg" }) {
  const Glyph = (icon && GOAL_ICONS[icon]) || Target;
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-2xl",
        size === "lg" ? "size-16" : "size-12",
        done ? "bg-income-soft text-income" : "bg-accent-soft text-accent",
      )}
    >
      <Glyph size={size === "lg" ? 30 : 22} weight="duotone" />
    </span>
  );
}

// Saved against the target: a meter (one value against a capacity), with
// quarter ticks so progress reads at a glance. Over 100% the bar stays full.
export function GoalMeter({ goal, className }: { goal: SavingsGoal; className?: string }) {
  const { t } = useI18n();
  const done = goal.status === "completed" || goal.progress >= 100;
  const width = Math.min(Math.max(goal.progress, 0), 100);
  return (
    <div
      role="progressbar"
      aria-label={t.goals.progressLabel(goal.name)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(goal.progress, 100)}
      aria-valuetext={t.goals.percent(goal.progress)}
      className={cn("relative h-2.5 overflow-hidden rounded-full bg-surface-3", className)}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
          done ? "bg-income" : goal.status === "archived" ? "bg-ink-3" : "bg-accent",
        )}
        style={{ width: `${width > 0 ? Math.max(width, 3) : 0}%` }}
      />
      {[25, 50, 75].map((tick) => (
        <span key={tick} aria-hidden className="absolute inset-y-0 w-px bg-surface/70" style={{ left: `${tick}%` }} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail: add or take out money, history, edit / pause / delete
// ---------------------------------------------------------------------------

function GoalDetail({
  goal,
  initialMode,
  onEdit,
  onClose,
}: {
  goal: SavingsGoal;
  initialMode?: "deposit" | "withdraw";
  onEdit: () => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { timeZone } = usePreferences();
  const [mode, setMode] = useState<"deposit" | "withdraw">(initialMode ?? "deposit");
  const [history, setHistory] = useState<GoalContribution[] | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [busy, startBusy] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const paused = goal.status === "archived";
  const done = goal.status === "completed";
  const left = Math.max(toCents(goal.targetAmount) - toCents(goal.saved), 0);

  useEffect(() => {
    let live = true;
    loadContributions(goal.id).then((list) => live && setHistory(list));
    return () => {
      live = false;
    };
  }, [goal.id, goal.saved]);

  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await addContribution(prev, formData);
    if (result.ok) {
      toast(result.message ?? t.common.saved, { tone: "success" });
      if (result.data?.completed) setCelebrate(true);
      const amount = document.getElementById("amount") as HTMLInputElement | null;
      const note = document.getElementById("goal-note") as HTMLInputElement | null;
      if (amount) amount.value = "";
      if (note) note.value = "";
    }
    return result;
  }, {});

  const when = (iso: string) =>
    new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone }).format(new Date(iso));

  return (
    <div className="space-y-6">
      {/* Where it stands */}
      <div className="flex items-center gap-4">
        <GoalIcon icon={goal.icon} done={done} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <Money value={goal.saved} currency={goal.currency} className="text-[28px] leading-none font-semibold tracking-tight" />
            <span className="text-sm text-ink-2">
              {t.goals.of} <Money value={goal.targetAmount} currency={goal.currency} />
            </span>
          </p>
          <GoalMeter goal={goal} className="mt-3" />
          <p className="mt-2 text-sm text-ink-2">
            <span className="tabular font-medium text-ink">{t.goals.percent(goal.progress)}</span>
            {" · "}
            {done ? t.goals.reachedLabel : paused ? t.goals.pausedLabel : t.goals.leftToGo(<Money cents={left} currency={goal.currency} />)}
          </p>
        </div>
      </div>

      {celebrate || (done && !initialMode) ? (
        <div className="goal-celebrate flex items-center gap-3 rounded-3xl bg-income-soft px-4 py-3.5 text-income" role="status">
          <Confetti size={26} weight="fill" className="shrink-0" aria-hidden />
          <div>
            <p className="text-[15px] font-semibold">{t.goals.reachedTitleOne}</p>
            <p className="text-sm text-ink-2">{t.goals.reachedHint}</p>
          </div>
        </div>
      ) : null}

      {paused ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-surface-2 px-4 py-3.5">
          <p className="text-sm text-ink-2">{t.goals.pausedHint}</p>
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              startBusy(async () => {
                const result = await setGoalStatus(goal.id, "active");
                toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
              })
            }
          >
            <ArrowCounterClockwise size={16} /> {t.goals.resume}
          </Button>
        </div>
      ) : (
        <form onSubmit={submitWith(formAction)} className="space-y-4" noValidate>
          <input type="hidden" name="goalId" value={goal.id} />
          <input type="hidden" name="kind" value={mode} />
          <Segmented
            label={t.goals.moveLabel}
            value={mode}
            onChange={setMode}
            className="w-full"
            options={[
              { value: "deposit", label: t.goals.deposit, icon: <ArrowDown size={16} weight="bold" /> },
              { value: "withdraw", label: t.goals.withdraw, icon: <ArrowUp size={16} weight="bold" /> },
            ]}
          />
          <AmountInput
            error={state.fieldErrors?.amount}
            result={state}
            tone={mode === "deposit" ? "income" : "expense"}
            currency={goal.currency}
          />
          <Field label={t.common.note} htmlFor="goal-note" optional>
            <Input id="goal-note" name="note" maxLength={200} autoComplete="off" placeholder={t.goals.notePlaceholder} />
          </Field>
          {state.message && !state.ok && !state.fieldErrors?.amount ? (
            <p role="alert" className="rounded-2xl bg-expense-soft px-4 py-3 text-sm text-expense">
              {state.message}
            </p>
          ) : null}
          <p className="text-xs leading-relaxed text-ink-3">{t.goals.noMoneyMoves}</p>
          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {pending ? t.common.saving : mode === "deposit" ? t.goals.saveDeposit : t.goals.saveWithdraw}
          </Button>
        </form>
      )}

      {/* History */}
      <section aria-labelledby="goal-history">
        <h3 id="goal-history" className="mb-2 text-sm font-medium">
          {t.goals.history}
        </h3>
        {history === null ? (
          <div className="space-y-2" aria-busy>
            <div className="skeleton h-12 rounded-2xl" />
            <div className="skeleton h-12 rounded-2xl" />
          </div>
        ) : history.length === 0 ? (
          <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-ink-2">{t.goals.noHistory}</p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {history.map((entry) => {
              const out = Number(entry.amount) < 0;
              return (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      out ? "bg-expense-soft text-expense" : "bg-income-soft text-income",
                    )}
                  >
                    {out ? <ArrowUp size={14} weight="bold" /> : <ArrowDown size={14} weight="bold" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">{entry.note || (out ? t.goals.withdraw : t.goals.deposit)}</span>
                    <span className="block text-xs text-ink-2">{when(entry.createdAt)}</span>
                  </span>
                  <Money
                    value={entry.amount}
                    currency={goal.currency}
                    sign
                    className={cn("shrink-0 text-[15px] font-semibold", out ? "text-expense" : "text-income")}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Manage */}
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Button size="sm" variant="secondary" onClick={onEdit}>
          <PencilSimple size={16} /> {t.common.edit}
        </Button>
        {!paused ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              startBusy(async () => {
                const result = await setGoalStatus(goal.id, "archived");
                toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
              })
            }
          >
            <Archive size={16} /> {t.goals.pause}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          className="ml-auto text-expense hover:bg-expense-soft"
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            startBusy(async () => {
              const result = await deleteGoal(goal.id);
              toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
              if (result.ok) onClose();
            });
          }}
        >
          <Trash size={16} /> {confirmDelete ? t.common.tapAgainToDelete : t.common.delete}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create / edit
// ---------------------------------------------------------------------------

function GoalForm({ goal, onDone }: { goal?: SavingsGoal; onDone: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const { currency: preferred } = usePreferences();
  // Only a known key: an emoji from elsewhere is dropped when saved here
  const [icon, setIcon] = useState(goal?.icon && GOAL_ICONS[goal.icon] ? goal.icon : "");
  const [currency, setCurrency] = useState(goal?.currency ?? preferred);

  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await saveGoal(prev, formData);
    if (result.ok) {
      toast(result.message ?? t.common.saved, { tone: "success" });
      onDone();
    }
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={submitWith(formAction)} className="space-y-6" noValidate>
      {goal ? <input type="hidden" name="id" value={goal.id} /> : null}
      <input type="hidden" name="icon" value={icon} />

      <div>
        <p className="mb-2 text-center text-sm text-ink-2">{t.goals.targetLabel}</p>
        <AmountInput
          defaultValue={goal?.targetAmount}
          error={errors.amount}
          result={state}
          tone="neutral"
          currency={currency}
          // A goal's currency is fixed once created (contributions are in it)
          onCurrencyChange={goal ? undefined : setCurrency}
        />
      </div>

      <Field label={t.common.name} htmlFor="goal-name" error={errors.name}>
        <Input
          id="goal-name"
          name="name"
          defaultValue={goal?.name ?? ""}
          maxLength={100}
          autoComplete="off"
          placeholder={t.goals.namePlaceholder}
          aria-invalid={Boolean(errors.name)}
        />
      </Field>

      <fieldset>
        <legend className="mb-3 text-sm font-medium">
          {t.goals.iconLabel} <span className="font-normal text-ink-3">· {t.common.optional}</span>
        </legend>
        <div role="radiogroup" aria-label={t.goals.iconLabel} className="grid grid-cols-7 gap-2">
          {Object.entries(GOAL_ICONS).map(([key, Glyph]) => {
            const checked = icon === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-label={t.goals.icons[key] ?? key}
                title={t.goals.icons[key] ?? key}
                onClick={() => setIcon(checked ? "" : key)}
                className={cn(
                  "flex aspect-square min-h-11 items-center justify-center rounded-2xl border transition-[background-color,border-color,color,transform] active:scale-95",
                  checked ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface-2 text-ink-2 hover:border-line-strong hover:text-ink",
                )}
              >
                <Glyph size={22} weight={checked ? "fill" : "regular"} aria-hidden />
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
        {pending ? t.common.saving : goal ? t.common.saveChanges : t.goals.create}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Home: the goals closest to done
// ---------------------------------------------------------------------------

export function GoalsGlance({ goals }: { goals: SavingsGoal[] }) {
  const { t } = useI18n();
  const active = goals
    .filter((g) => g.status === "active")
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);
  return (
    <Card className="rise flex flex-col p-6" style={{ "--i": 4 } as React.CSSProperties} aria-labelledby="goals-glance">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id="goals-glance" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
          <PiggyBank size={20} className="text-accent" aria-hidden /> {t.goals.title}
        </h2>
        <Link
          href="/goals"
          aria-label={t.common.seeAll}
          title={t.common.seeAll}
          className="-mr-2 flex size-10 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ArrowRight size={18} />
        </Link>
      </div>
      {active.length ? (
        <ul className="space-y-4">
          {active.map((goal) => (
            <li key={goal.id}>
              <Link href={`/goals?goal=${goal.id}`} className="group flex items-center gap-3 rounded-2xl">
                <GoalIcon icon={goal.icon} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-medium group-hover:underline">{goal.name}</span>
                    <span className="tabular shrink-0 text-sm text-ink-2">{t.goals.percent(goal.progress)}</span>
                  </span>
                  <GoalMeter goal={goal} className="mt-2" />
                  <span className="mt-1.5 block truncate text-xs text-ink-2">
                    <Money value={goal.saved} currency={goal.currency} className="font-medium text-ink" /> {t.goals.of}{" "}
                    <Money value={goal.targetAmount} currency={goal.currency} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Link
          href="/goals?new=1"
          className="flex flex-1 items-center justify-center gap-3 rounded-3xl border border-dashed border-line-strong px-4 py-6 text-[15px] font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent"
        >
          <Plus size={20} weight="bold" aria-hidden /> {t.goals.newGoal}
        </Link>
      )}
    </Card>
  );
}
