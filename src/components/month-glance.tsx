import { ArrowDown, ArrowRight, ArrowUp, CaretDown, CaretUp, FlagCheckered, PiggyBank, Sun, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { Dictionary } from "@/i18n/dictionaries";

import { Money } from "./preferences";
import { Card, cn } from "./ui";

// This month without reading: what you kept is the big number; money in and
// out are told apart by arrow, sign and color (the same arrows as the Expense
// and Income buttons); one bar shows how much of what came in has gone out,
// with a flag where spending lands by month end at this pace. Every figure
// still has its words for screen readers and as a tooltip.
export function MonthGlance({
  month,
  income,
  expense,
  net,
  projected,
  today,
  change,
  prevMonth,
  t,
  locale,
}: {
  month: string;
  income: number;
  expense: number;
  net: number;
  projected: number;
  today: number;
  // Spending vs last month, as a fraction (0.12 = 12% more); null if unknown
  change: number | null;
  prevMonth: string;
  t: Dictionary;
  locale: string;
}) {
  const g = t.home.glance;
  const kept = net >= 0;
  // The bar is what came in; spent fills it from the left. Over budget, it's
  // all spent; the flag marks the month-end projection.
  const spentShare = income > 0 ? Math.min(expense / income, 1) : expense > 0 ? 1 : 0;
  const projectedShare = income > 0 ? Math.min(projected / income, 1) : null;
  const overPace = income > 0 && projected > income;
  const pct = (n: number) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(n);

  return (
    <Card className="rise flex flex-col p-6 sm:p-7 lg:col-span-5" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="month-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="month-title" className="text-[17px] font-semibold tracking-tight">
          {month}
        </h2>
        <Link
          href="/insights"
          aria-label={t.common.details}
          title={t.common.details}
          className="-mr-2 flex size-10 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ArrowRight size={18} />
        </Link>
      </div>

      {/* What you kept: the one number */}
      <div className="mt-4 flex items-center gap-3" title={g.kept}>
        <span
          aria-hidden
          className={cn("flex size-11 shrink-0 items-center justify-center rounded-full", kept ? "bg-income-soft text-income" : "bg-expense-soft text-expense")}
        >
          {kept ? <PiggyBank size={22} weight="fill" /> : <WarningCircle size={22} weight="fill" />}
        </span>
        <p className="min-w-0">
          <span className="sr-only">{g.kept}: </span>
          <Money
            cents={net}
            sign
            className={cn("block truncate text-[34px] leading-none font-semibold tracking-tight", kept ? "text-ink" : "text-expense")}
          />
        </p>
      </div>

      {/* In → out: one bar. The track is what came in (green: still
          yours); solid = spent so far; faded = what's still coming at this
          pace, to the month-end flag. Over pace, it turns red. */}
      <div
        role="img"
        aria-label={g.barLabel(pct(income > 0 ? expense / income : 0))}
        className={cn("relative mt-5 h-3 overflow-hidden rounded-full", income > 0 ? "bg-income/35" : "bg-surface-3")}
      >
        {projectedShare !== null && projectedShare > spentShare ? (
          <span
            className="absolute inset-y-0 left-0 rounded-full opacity-70"
            style={{
              width: `${projectedShare * 100}%`,
              // Stripes: a forecast, not money already gone
              backgroundImage: `repeating-linear-gradient(135deg, var(${overPace ? "--expense" : "--chart-expense"}) 0 3px, transparent 3px 7px)`,
            }}
          />
        ) : null}
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full", spentShare >= 1 ? "bg-expense" : "bg-chart-expense")}
          style={{ width: `${spentShare * 100}%` }}
        />
      </div>

      {/* In and out: arrows, signs and colors say which is which */}
      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-surface-2 p-3" title={g.in}>
          <dt className="shrink-0">
            <span className="flex size-9 items-center justify-center rounded-full bg-income-soft text-income">
              <ArrowDown size={18} weight="bold" aria-hidden />
            </span>
            <span className="sr-only">{g.in}</span>
          </dt>
          <dd className="min-w-0">
            <Money cents={income} sign className="block truncate text-lg font-semibold tracking-tight text-income" />
          </dd>
        </div>
        <div className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-surface-2 p-3" title={g.out}>
          <dt className="shrink-0">
            <span className="flex size-9 items-center justify-center rounded-full bg-expense-soft text-expense">
              <ArrowUp size={18} weight="bold" aria-hidden />
            </span>
            <span className="sr-only">{g.out}</span>
          </dt>
          <dd className="min-w-0">
            <Money cents={-expense} sign className="block truncate text-lg font-semibold tracking-tight" />
            {change !== null && change !== 0 ? (
              <span
                className={cn("flex items-center gap-0.5 text-xs font-medium", change > 0 ? "text-expense" : "text-income")}
                title={g.vsLast(prevMonth)}
              >
                {change > 0 ? <CaretUp size={11} weight="fill" aria-hidden /> : <CaretDown size={11} weight="fill" aria-hidden />}
                {pct(Math.abs(change))}
                <span className="sr-only"> {g.vsLast(prevMonth)}</span>
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      {/* Pace and today, as icon + number */}
      <dl className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-5 text-sm">
        <div className={cn("flex items-center gap-1.5", overPace ? "text-expense" : "text-ink-2")} title={g.projected}>
          <dt>
            <FlagCheckered size={16} weight="fill" aria-hidden />
            <span className="sr-only">{g.projected}</span>
          </dt>
          <dd>
            <Money cents={projected} approximate className="font-medium" />
          </dd>
        </div>
        <div className="flex items-center gap-1.5 text-ink-2" title={g.today}>
          <dt>
            <Sun size={16} weight="fill" aria-hidden />
            <span className="sr-only">{g.today}</span>
          </dt>
          <dd>
            <Money cents={today} className="font-medium" />
          </dd>
        </div>
      </dl>
    </Card>
  );
}
