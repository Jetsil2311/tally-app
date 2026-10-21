"use client";

import { ArrowRight, ArrowsClockwise, ChartPieSlice, Plus, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { deleteBudget, saveBudget } from "@/actions/budgets";
import { useI18n } from "@/i18n/client";
import { categoryLabel, isSystemCategory } from "@/lib/insights";
import { toCents } from "@/lib/money";
import { canManage } from "@/lib/permissions";
import type { Account, ActionState, Budget, Category } from "@/lib/types";

import { Money, usePreferences } from "./preferences";
import { AmountInput } from "./quick-add";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, Card, cn } from "./ui";
import { submitWith } from "./use-form-action";

// Budgets: a monthly limit per category (or overall), personal or on an
// account. A meter shows how much is gone; its color says how it's going
// (accent, amber from 80%, red when over). No figures need a caption.

export type BudgetGroup = { account: Account | null; budgets: Budget[] };

type Panel = { kind: "new" } | { kind: "edit"; budget: Budget; account: Account | null };

export function BudgetsManager({ groups, accounts, categories }: { groups: BudgetGroup[]; accounts: Account[]; categories: Category[] }) {
  const { t } = useI18n();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [isOpen, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const open = (next: Panel) => {
    setPanel(next);
    setSession((n) => n + 1);
    setOpen(true);
  };
  const any = groups.some((g) => g.budgets.length);

  return (
    <>
      <header className="rise flex items-center justify-between gap-4 pt-2">
        <h1 className="text-[32px] leading-[1.05] font-semibold sm:text-[40px]">{t.budgets.title}</h1>
        <Button onClick={() => open({ kind: "new" })}>
          <Plus size={18} weight="bold" /> {t.budgets.add}
        </Button>
      </header>

      {!any ? (
        <button
          type="button"
          onClick={() => open({ kind: "new" })}
          className="rise flex w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-line-strong px-6 py-14 text-ink-2 transition-colors hover:border-accent hover:text-accent"
        >
          <ChartPieSlice size={36} weight="duotone" aria-hidden />
          <span className="text-[17px] font-semibold">{t.budgets.add}</span>
        </button>
      ) : null}

      {groups
        .filter((group) => group.budgets.length)
        .map((group) => {
          // Overall first (the whole month), then categories by how close they are
          const overall = group.budgets.filter((b) => !b.categoryId);
          const rest = group.budgets.filter((b) => b.categoryId).sort((a, b) => b.progress - a.progress);
          return (
            <section key={group.account?.id ?? "you"} aria-labelledby={`budgets-${group.account?.id ?? "you"}`} className="space-y-3">
              <h2 id={`budgets-${group.account?.id ?? "you"}`} className="text-[17px] font-semibold tracking-tight">
                {group.account ? group.account.name : t.nav.you}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...overall, ...rest].map((budget, i) => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    index={i}
                    editable={!group.account || canManage(group.account.myRole)}
                    onOpen={() => open({ kind: "edit", budget, account: group.account })}
                  />
                ))}
              </div>
            </section>
          );
        })}

      <Sheet open={isOpen} onClose={() => setOpen(false)} title={panel?.kind === "edit" ? budgetName(panel.budget, t) : t.budgets.add}>
        {panel?.kind === "new" ? (
          <BudgetForm key={session} accounts={accounts} categories={categories} taken={groups} onDone={() => setOpen(false)} />
        ) : null}
        {panel?.kind === "edit" ? (
          <BudgetForm key={session} budget={panel.budget} account={panel.account} accounts={accounts} categories={categories} taken={groups} onDone={() => setOpen(false)} />
        ) : null}
      </Sheet>
    </>
  );
}

function budgetName(budget: Budget, t: ReturnType<typeof useI18n>["t"]) {
  return budget.category ? categoryLabel(budget.category, t) : t.budgets.overall;
}

// accent until 80%, amber up to 100%, red over
function tone(budget: Budget) {
  return budget.overBudget || budget.progress > 100 ? "over" : budget.progress >= 80 ? "near" : "ok";
}

export function BudgetMeter({ budget, className }: { budget: Budget; className?: string }) {
  const { t } = useI18n();
  const state = tone(budget);
  return (
    <div
      role="progressbar"
      aria-label={budgetName(budget, t)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(budget.progress, 100)}
      aria-valuetext={`${budget.progress}%`}
      className={cn("h-2.5 overflow-hidden rounded-full bg-surface-3", className)}
    >
      <span
        className={cn(
          "block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
          state === "over" ? "bg-expense" : state === "near" ? "bg-warn" : "bg-accent",
        )}
        style={{ width: `${budget.progress > 0 ? Math.max(Math.min(budget.progress, 100), 3) : 0}%` }}
      />
    </div>
  );
}

function BudgetCard({ budget, index, editable, onOpen }: { budget: Budget; index: number; editable: boolean; onOpen: () => void }) {
  const { t } = useI18n();
  const state = tone(budget);
  const rolled = toCents(budget.limit) - toCents(budget.amount);
  const remaining = toCents(budget.remaining);
  const overall = !budget.categoryId;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className={cn("min-w-0 truncate font-semibold tracking-tight", overall ? "text-[19px]" : "text-[17px]")}>{budgetName(budget, t)}</h3>
        {budget.rollover && rolled > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent" title={t.budgets.rolled}>
            <ArrowsClockwise size={13} weight="bold" aria-hidden />
            <Money cents={rolled} currency={budget.currency} sign />
            <span className="sr-only">{t.budgets.rolled}</span>
          </span>
        ) : null}
      </div>
      <p className={cn("font-display mt-3 font-semibold tracking-[-0.03em]", overall ? "text-[30px] leading-none" : "text-2xl leading-none", state === "over" && "text-expense")}>
        {state === "over"
          ? t.budgets.over(<Money cents={-remaining} currency={budget.currency} />)
          : t.budgets.left(<Money cents={remaining} currency={budget.currency} />)}
      </p>
      <BudgetMeter budget={budget} className="mt-4" />
      <p className="mt-2 flex justify-between text-sm text-ink-2">
        <Money value={budget.spent} currency={budget.currency} className="font-medium text-ink" />
        <Money value={budget.limit} currency={budget.currency} />
      </p>
    </>
  );

  const cardClass = cn(
    "card rise rounded-3xl p-5 text-left",
    state === "over" ? "border-expense/40" : state === "near" ? "border-warn/40" : null,
    editable && "card-press",
    overall && "sm:col-span-2 lg:col-span-1",
  );
  return editable ? (
    <button type="button" onClick={onOpen} className={cn(cardClass, "w-full")} style={{ "--i": index } as React.CSSProperties}>
      {body}
    </button>
  ) : (
    <article className={cardClass} style={{ "--i": index } as React.CSSProperties}>
      {body}
    </article>
  );
}

function BudgetForm({
  budget,
  account,
  accounts,
  categories,
  taken,
  onDone,
}: {
  budget?: Budget;
  account?: Account | null;
  accounts: Account[];
  categories: Category[];
  taken: BudgetGroup[];
  onDone: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const { currency: preferred } = usePreferences();
  // Where it applies: just you, or an account you manage
  const scopes = [null, ...accounts.filter((a) => a.isActive && canManage(a.myRole))];
  const [scope, setScope] = useState<string>(account?.id ?? "");
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? "");
  const [rollover, setRollover] = useState(budget?.rollover ?? false);
  const [deleting, startDelete] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const scopeAccount = scopes.find((a) => (a?.id ?? "") === scope) ?? null;
  const currency = budget?.currency ?? scopeAccount?.currency ?? preferred;
  // One budget per category per scope: hide the ones already set
  const used = new Set(taken.find((g) => (g.account?.id ?? "") === scope)?.budgets.map((b) => b.categoryId ?? "") ?? []);
  const options = categories.filter(
    (c) => !isSystemCategory(c.name) && (c.accountId === null || c.accountId === scope) && !used.has(c.id),
  );

  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await saveBudget(prev, formData);
    if (result.ok) {
      toast(result.message ?? t.common.saved, { tone: "success" });
      onDone();
    }
    return result;
  }, {});

  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-[15px] transition-colors",
      active ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:border-line-strong",
    );

  return (
    <form onSubmit={submitWith(formAction)} className="space-y-6" noValidate>
      {budget ? <input type="hidden" name="id" value={budget.id} /> : null}
      <input type="hidden" name="accountId" value={scope} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <input type="hidden" name="currency" value={currency} />

      <AmountInput defaultValue={budget?.amount} error={state.fieldErrors?.amount} result={state} tone="neutral" currency={currency} />

      {!budget ? (
        <>
          {scopes.length > 1 ? (
            <fieldset>
              <legend className="mb-3 text-sm font-medium">{t.budgets.forWho}</legend>
              <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                {scopes.map((a) => (
                  <button
                    key={a?.id ?? "you"}
                    type="button"
                    aria-pressed={(a?.id ?? "") === scope}
                    onClick={() => {
                      setScope(a?.id ?? "");
                      setCategoryId("");
                    }}
                    className={chip((a?.id ?? "") === scope)}
                  >
                    {a ? a.name : t.nav.you}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
          <fieldset>
            <legend className="mb-3 text-sm font-medium">{t.common.category}</legend>
            <div className="flex flex-wrap gap-2">
              {!used.has("") ? (
                <button type="button" aria-pressed={categoryId === ""} onClick={() => setCategoryId("")} className={chip(categoryId === "")}>
                  {t.budgets.overall}
                </button>
              ) : null}
              {options.map((c) => (
                <button key={c.id} type="button" aria-pressed={categoryId === c.id} onClick={() => setCategoryId(c.id)} className={chip(categoryId === c.id)}>
                  {categoryLabel(c.name, t)}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      ) : null}

      {/* A switch, not a checkbox: on/off at a glance */}
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-surface-2 px-4 py-3.5">
        <span className="flex items-center gap-3 text-[15px] font-medium">
          <ArrowsClockwise size={20} className="text-accent" aria-hidden />
          {t.budgets.rollover}
        </span>
        <input
          type="checkbox"
          name="rollover"
          role="switch"
          checked={rollover}
          onChange={(e) => setRollover(e.target.checked)}
          className="switch"
        />
      </label>

      {state.message && !state.ok && !state.fieldErrors?.amount ? (
        <p role="alert" className="rounded-2xl bg-expense-soft px-4 py-3 text-sm text-expense">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {budget ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={deleting}
            className="text-expense hover:bg-expense-soft sm:flex-1"
            onClick={() => {
              if (!confirm) return setConfirm(true);
              startDelete(async () => {
                const result = await deleteBudget(budget.id, account?.id ?? null);
                toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
                if (result.ok) onDone();
              });
            }}
          >
            <Trash size={18} /> {confirm ? t.common.tapAgainToDelete : t.common.delete}
          </Button>
        ) : null}
        <Button type="submit" size="lg" disabled={pending} className="sm:flex-1">
          {pending ? t.common.saving : budget ? t.common.saveChanges : t.budgets.add}
        </Button>
      </div>
    </form>
  );
}

// Home: the budgets closest to their limit
export function BudgetsGlance({ budgets }: { budgets: Budget[] }) {
  const { t } = useI18n();
  const top = [...budgets].sort((a, b) => b.progress - a.progress).slice(0, 3);
  return (
    <Card className="rise flex flex-col p-6" style={{ "--i": 4 } as React.CSSProperties} aria-labelledby="budgets-glance">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="budgets-glance" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
          <ChartPieSlice size={20} className="text-accent" aria-hidden /> {t.budgets.title}
        </h2>
        <Link
          href="/budgets"
          aria-label={t.common.seeAll}
          title={t.common.seeAll}
          className="-mr-2 flex size-10 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ArrowRight size={18} />
        </Link>
      </div>
      {top.length ? (
        <ul className="space-y-4">
          {top.map((budget) => {
            const state = tone(budget);
            const remaining = toCents(budget.remaining);
            return (
              <li key={budget.id}>
                <p className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span className="truncate font-medium">{budgetName(budget, t)}</span>
                  <span className={cn("shrink-0 text-sm", state === "over" ? "font-semibold text-expense" : "text-ink-2")}>
                    {state === "over"
                      ? t.budgets.over(<Money cents={-remaining} currency={budget.currency} />)
                      : t.budgets.left(<Money cents={remaining} currency={budget.currency} />)}
                  </span>
                </p>
                <BudgetMeter budget={budget} className="mt-2" />
              </li>
            );
          })}
        </ul>
      ) : (
        <Link
          href="/budgets"
          className="flex flex-1 items-center justify-center gap-3 rounded-3xl border border-dashed border-line-strong px-4 py-6 text-[15px] font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent"
        >
          <Plus size={20} weight="bold" aria-hidden /> {t.budgets.add}
        </Link>
      )}
    </Card>
  );
}
