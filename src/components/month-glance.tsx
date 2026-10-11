import { ArrowDown, ArrowRight, ArrowUp, CaretDown, CaretUp, CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import type { Dictionary } from "@/i18n/dictionaries";

import { Money } from "./preferences";
import { Card, cn } from "./ui";

// This month in a glance. Short plain words where an icon can't say it
// ("Left", "In", "Out", "Today"), and color does the rest: the bar is a
// picture of the two numbers under it (orange = out, green = what's left of
// what came in), so it needs no legend. Pace is a sentence, red only when
// you're on track to spend more than came in.
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
  const left = net >= 0;
  const spentShare = income > 0 ? Math.min(expense / income, 1) : expense > 0 ? 1 : 0;
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

      {/* What's left: the one number */}
      <p className="mt-3 text-sm font-medium text-ink-2">{g.left}</p>
      <Money
        cents={net}
        sign
        className={cn("mt-0.5 block truncate text-[36px] leading-none font-semibold tracking-tight", left ? "text-income" : "text-expense")}
      />

      {/* The two numbers below, as one bar: orange went out, green is left */}
      <div
        role="img"
        aria-label={g.barLabel(pct(income > 0 ? expense / income : 0))}
        className={cn("relative mt-5 h-3 overflow-hidden rounded-full", income > 0 ? "bg-income" : "bg-surface-3")}
      >
        {spentShare > 0 ? (
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-chart-expense ring-2 ring-surface"
            style={{ width: `${spentShare * 100}%` }}
          />
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-sm font-medium text-ink-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-income text-surface">
              <ArrowDown size={12} weight="bold" aria-hidden />
            </span>
            {g.in}
          </dt>
          <dd className="mt-1">
            <Money cents={income} sign className="block truncate text-xl font-semibold tracking-tight" />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-sm font-medium text-ink-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-chart-expense text-surface">
              <ArrowUp size={12} weight="bold" aria-hidden />
            </span>
            {g.out}
            {change !== null && change !== 0 ? (
              <span
                className={cn("ml-auto flex items-center gap-0.5 text-xs", change > 0 ? "text-expense" : "text-income")}
                title={g.vsLast(prevMonth)}
              >
                {change > 0 ? <CaretUp size={11} weight="fill" aria-hidden /> : <CaretDown size={11} weight="fill" aria-hidden />}
                {pct(Math.abs(change))}
                <span className="sr-only"> {g.vsLast(prevMonth)}</span>
              </span>
            ) : null}
          </dt>
          <dd className="mt-1">
            <Money cents={-expense} sign className="block truncate text-xl font-semibold tracking-tight" />
          </dd>
        </div>
      </dl>

      {/* Pace: a sentence, red only when it's a problem */}
      <div className="mt-auto pt-5">
        {expense > 0 ? (
          <p
            className={cn(
              "flex items-start gap-2 rounded-2xl px-3 py-2.5 text-sm leading-snug",
              overPace ? "bg-expense-soft text-expense" : "bg-surface-2 text-ink-2",
            )}
          >
            {overPace ? (
              <WarningCircle size={18} weight="fill" className="mt-px shrink-0" aria-hidden />
            ) : (
              <CheckCircle size={18} weight="fill" className="mt-px shrink-0 text-income" aria-hidden />
            )}
            <span>
              {overPace
                ? g.overPace(<Money cents={projected} approximate className="font-semibold" />)
                : g.onPace(<Money cents={projected} approximate className="font-semibold text-ink" />)}
            </span>
          </p>
        ) : null}
        <p className="mt-3 text-sm text-ink-2">
          {g.today} <Money cents={today > 0 ? -today : 0} sign={today > 0} className="font-medium text-ink" />
        </p>
      </div>
    </Card>
  );
}
