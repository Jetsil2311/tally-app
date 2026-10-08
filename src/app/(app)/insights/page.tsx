import { ArrowDownRight, ArrowUpRight, ChartBar, TrendDown, TrendUp } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SpendingCalendar } from "@/components/charts";
import { CategoryDrilldown, InsightsHeader, YearChart } from "@/components/insights-controls";
import { Money } from "@/components/preferences";
import { TransactionRow } from "@/components/transaction-row";
import { Card, cn, EmptyState, SectionTitle, Skeleton } from "@/components/ui";
import { getAllTransactions, getCategories, getSummary, getYearSeries } from "@/lib/data";
import {
  currentMonthKey,
  dayKey,
  daysInMonth,
  monthLabel,
  monthRange,
  parseMonthKey,
  shiftMonth,
  todayParts,
  yearRange,
  type MonthKey,
} from "@/lib/dates";
import { change, isTransfer, rollUpCategories, savingsRate, totalsFromSummary } from "@/lib/insights";
import { percent, toCents } from "@/lib/money";
import { getPreferences, requestTime } from "@/lib/session";

export const metadata: Metadata = { title: "Insights" };

export default function InsightsPage({ searchParams }: PageProps<"/insights">) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <Suspense fallback={<InsightsSkeleton />}>
        <Insights searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

async function Insights({ searchParams }: { searchParams: PageProps<"/insights">["searchParams"] }) {
  const params = await searchParams;
  const { timeZone } = await getPreferences();
  const now = await requestTime();
  const current = currentMonthKey(timeZone, now);
  const currentYear = todayParts(timeZone, now).year;

  if (single(params.view) === "year") {
    const raw = Number(single(params.year));
    const year = Number.isInteger(raw) && raw > 1970 && raw <= currentYear ? raw : currentYear;
    return <YearView year={year} currentYear={currentYear} current={current} timeZone={timeZone} />;
  }

  const raw = single(params.month);
  const month = parseMonthKey(raw) && (raw as MonthKey) <= current ? (raw as MonthKey) : current;
  return <MonthView month={month} current={current} timeZone={timeZone} now={now} />;
}

function Kpi({
  label,
  cents,
  delta,
  tone = "text-ink",
  sign,
  invert,
  note,
  index,
}: {
  label: string;
  cents?: number;
  delta?: number | null;
  tone?: string;
  sign?: boolean;
  invert?: boolean; // for expenses, going up is bad
  note?: React.ReactNode;
  index: number;
}) {
  const good = delta == null ? null : invert ? delta < 0 : delta > 0;
  return (
    <Card className="rise p-5" style={{ "--i": index } as React.CSSProperties}>
      <p className="text-sm text-ink-2">{label}</p>
      {cents !== undefined ? (
        <Money cents={cents} sign={sign} className={cn("mt-1 block text-[26px] leading-tight font-semibold tracking-tight", tone)} />
      ) : null}
      {note ? <div className="mt-1">{note}</div> : null}
      {delta != null ? (
        <p className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", good ? "bg-income-soft text-income" : "bg-expense-soft text-expense")}>
          {delta > 0 ? <ArrowUpRight size={12} weight="bold" /> : <ArrowDownRight size={12} weight="bold" />}
          {percent(Math.abs(delta))}
        </p>
      ) : null}
    </Card>
  );
}

async function MonthView({ month, current, timeZone, now }: { month: MonthKey; current: MonthKey; timeZone: string; now: Date }) {
  const range = monthRange(month, timeZone);
  const prevKey = shiftMonth(month, -1);
  const prevRange = monthRange(prevKey, timeZone);
  const [summary, prevSummary, categories, txs] = await Promise.all([
    getSummary(range.from, range.to),
    getSummary(prevRange.from, prevRange.to),
    getCategories(),
    getAllTransactions({ from: range.from, to: range.to }),
  ]);
  const totals = totalsFromSummary(summary);
  const prev = totalsFromSummary(prevSummary);
  const rate = savingsRate(totals.income, totals.expense);
  const prevRate = savingsRate(prev.income, prev.expense);
  const spending = rollUpCategories(totals.byCategory, categories, "expense");
  const earning = rollUpCategories(totals.byCategory, categories, "income");

  const days: Record<string, number> = {};
  const expenses = txs.rows.filter((tx) => tx.type === "expense" && !isTransfer(tx));
  for (const tx of expenses) {
    const key = dayKey(tx.date, timeZone);
    days[key] = (days[key] ?? 0) + toCents(tx.amount);
  }
  const biggest = [...expenses].sort((a, b) => toCents(b.amount) - toCents(a.amount)).slice(0, 5);
  const spendDays = Object.keys(days).length;
  const elapsedDays = month === current ? todayParts(timeZone, now).day : daysInMonth(month);
  const label = monthLabel(month);

  return (
    <>
      <InsightsHeader
        view="month"
        label={label}
        prevHref={`/insights?view=month&month=${prevKey}`}
        nextHref={month < current ? `/insights?view=month&month=${shiftMonth(month, 1)}` : null}
        monthHref={`/insights?view=month&month=${month}`}
        yearHref={`/insights?view=year&year=${month.slice(0, 4)}`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Kpi index={0} label="Income" cents={totals.income} tone="text-income" delta={change(totals.income, prev.income)} />
        <Kpi index={1} label="Expenses" cents={totals.expense} delta={change(totals.expense, prev.expense)} invert />
        <Kpi index={2} label="Net" cents={totals.net} sign tone={totals.net < 0 ? "text-expense" : "text-ink"} />
        <Kpi
          index={3}
          label="Savings rate"
          note={
            <p className="text-[26px] leading-tight font-semibold tracking-tight">{rate === null ? "–" : percent(rate)}</p>
          }
          delta={rate !== null && prevRate !== null ? rate - prevRate : null}
        />
      </div>
      <p className="-mt-1 text-sm text-ink-2">
        Compared with {monthLabel(prevKey, "long", false)}. Transfers between your accounts aren&apos;t counted.
      </p>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Card className="rise p-6" style={{ "--i": 4 } as React.CSSProperties}>
          <SectionTitle>Spending by category</SectionTitle>
          {spending.length ? (
            <CategoryDrilldown rows={spending} type="expense" month={month} limit={8} />
          ) : (
            <EmptyState icon={<ChartBar size={24} />} title="No expenses this month" className="py-6" />
          )}
        </Card>
        <Card className="rise p-6" style={{ "--i": 5 } as React.CSSProperties}>
          <SectionTitle>Income by source</SectionTitle>
          {earning.length ? (
            <CategoryDrilldown rows={earning} type="income" month={month} limit={8} />
          ) : (
            <EmptyState icon={<ChartBar size={24} />} title="No income this month" className="py-6" />
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <Card className="rise p-6 lg:col-span-5" style={{ "--i": 6 } as React.CSSProperties}>
          <SectionTitle>Day by day</SectionTitle>
          <SpendingCalendar monthKey={month} days={days} today={month === current ? dayKey(now, timeZone) : undefined} />
          <p className="mt-4 text-sm text-ink-2">
            You spent money on {spendDays} of {elapsedDays} {elapsedDays === 1 ? "day" : "days"}
            {month === current ? " so far" : ""}.
          </p>
        </Card>
        <Card className="rise p-3 sm:p-4 lg:col-span-7" style={{ "--i": 7 } as React.CSSProperties}>
          <div className="px-3 pt-2">
            <SectionTitle>Biggest expenses</SectionTitle>
          </div>
          {biggest.length ? (
            biggest.map((tx) => <TransactionRow key={tx.id} tx={tx} showDate />)
          ) : (
            <p className="px-3 pb-4 text-sm text-ink-2">Nothing yet.</p>
          )}
        </Card>
      </div>
    </>
  );
}

async function YearView({
  year,
  currentYear,
  current,
  timeZone,
}: {
  year: number;
  currentYear: number;
  current: MonthKey;
  timeZone: string;
}) {
  const range = yearRange(year, timeZone);
  const prevRange = yearRange(year - 1, timeZone);
  const [series, summary, prevSummary, categories] = await Promise.all([
    getYearSeries(year, timeZone),
    getSummary(range.from, range.to),
    getSummary(prevRange.from, prevRange.to),
    getCategories(),
  ]);

  const totals = totalsFromSummary(summary);
  const prev = totalsFromSummary(prevSummary);
  const months = series
    .filter(({ key }) => key <= current)
    .map(({ key, summary }) => ({ key: key as MonthKey, ...totalsFromSummary(summary) }));
  const withActivity = months.filter((m) => m.income || m.expense);
  const elapsed = Math.max(withActivity.length, 1);
  const best = withActivity.length ? withActivity.reduce((a, b) => (b.net > a.net ? b : a)) : null;
  const priciest = withActivity.length ? withActivity.reduce((a, b) => (b.expense > a.expense ? b : a)) : null;
  const rate = savingsRate(totals.income, totals.expense);
  const spending = rollUpCategories(totals.byCategory, categories, "expense");
  const earning = rollUpCategories(totals.byCategory, categories, "income");

  return (
    <>
      <InsightsHeader
        view="year"
        label={String(year)}
        prevHref={`/insights?view=year&year=${year - 1}`}
        nextHref={year < currentYear ? `/insights?view=year&year=${year + 1}` : null}
        monthHref={`/insights?view=month&month=${year === currentYear ? current : `${year}-12`}`}
        yearHref={`/insights?view=year&year=${year}`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Kpi index={0} label={`Income in ${year}`} cents={totals.income} tone="text-income" delta={change(totals.income, prev.income)} />
        <Kpi index={1} label={`Expenses in ${year}`} cents={totals.expense} delta={change(totals.expense, prev.expense)} invert />
        <Kpi index={2} label="Spent per month, avg." cents={Math.round(totals.expense / elapsed)} />
        <Kpi
          index={3}
          label="Kept"
          cents={totals.net}
          sign
          tone={totals.net < 0 ? "text-expense" : "text-ink"}
          note={rate !== null ? <p className="text-sm text-ink-2">{percent(rate)} of income</p> : null}
        />
      </div>
      <p className="-mt-1 text-sm text-ink-2">Compared with {year - 1}. Transfers between your accounts aren&apos;t counted.</p>

      <Card className="rise p-6" style={{ "--i": 4 } as React.CSSProperties}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold tracking-tight">Month by month</h2>
          <ul className="flex items-center gap-4 text-sm text-ink-2">
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px] bg-chart-income" aria-hidden /> In
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px] bg-chart-expense" aria-hidden /> Out
            </li>
          </ul>
        </div>
        <YearChart year={year} points={series.map(({ key, summary }) => {
          const t = totalsFromSummary(summary);
          return { key: key as MonthKey, income: t.income, expense: t.expense };
        })} />
        <p className="mt-4 text-sm text-ink-2">Select a month to open it.</p>
      </Card>

      {best || priciest ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {best ? (
            <Card className="rise flex items-center gap-4 p-5" style={{ "--i": 5 } as React.CSSProperties}>
              <span className="flex size-11 items-center justify-center rounded-full bg-income-soft text-income">
                <TrendUp size={22} />
              </span>
              <div>
                <p className="text-sm text-ink-2">Best month</p>
                <p className="font-medium">
                  {monthLabel(best.key, "long", false)}, kept <Money cents={best.net} sign />
                </p>
              </div>
            </Card>
          ) : null}
          {priciest ? (
            <Card className="rise flex items-center gap-4 p-5" style={{ "--i": 6 } as React.CSSProperties}>
              <span className="flex size-11 items-center justify-center rounded-full bg-expense-soft text-expense">
                <TrendDown size={22} />
              </span>
              <div>
                <p className="text-sm text-ink-2">Most spent</p>
                <p className="font-medium">
                  {monthLabel(priciest.key, "long", false)}, <Money cents={priciest.expense} />
                </p>
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Card className="rise p-6" style={{ "--i": 7 } as React.CSSProperties}>
          <SectionTitle>Where {year}&apos;s money went</SectionTitle>
          {spending.length ? (
            <CategoryDrilldown rows={spending} type="expense" limit={8} />
          ) : (
            <EmptyState icon={<ChartBar size={24} />} title="No expenses this year" className="py-6" />
          )}
        </Card>
        <Card className="rise p-6" style={{ "--i": 8 } as React.CSSProperties}>
          <SectionTitle>Where it came from</SectionTitle>
          {earning.length ? (
            <CategoryDrilldown rows={earning} type="income" limit={8} />
          ) : (
            <EmptyState icon={<ChartBar size={24} />} title="No income this year" className="py-6" />
          )}
        </Card>
      </div>

      <Card className="rise overflow-hidden" style={{ "--i": 9 } as React.CSSProperties}>
        <div className="px-6 pt-6">
          <SectionTitle>Monthly breakdown</SectionTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[15px]">
            <thead>
              <tr className="text-left text-sm text-ink-2">
                <th scope="col" className="px-6 py-3 font-medium">Month</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">In</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Out</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">Net</th>
                <th scope="col" className="px-6 py-3 text-right font-medium">Saved</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => {
                const r = savingsRate(m.income, m.expense);
                return (
                  <tr key={m.key} className="border-t border-line transition-colors hover:bg-surface-2">
                    <th scope="row" className="px-6 py-3 text-left font-medium">
                      <Link href={`/insights?view=month&month=${m.key}`} className="underline-offset-4 hover:underline">
                        {monthLabel(m.key, "long", false)}
                      </Link>
                    </th>
                    <td className="px-3 py-3 text-right">
                      <Money cents={m.income} className="text-income" />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Money cents={m.expense} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Money cents={m.net} sign className={m.net < 0 ? "text-expense" : ""} />
                    </td>
                    <td className="tabular px-6 py-3 text-right text-ink-2">{r === null ? "–" : percent(r)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line-strong font-semibold">
                <th scope="row" className="px-6 py-3 text-left">Total</th>
                <td className="px-3 py-3 text-right">
                  <Money cents={totals.income} className="text-income" />
                </td>
                <td className="px-3 py-3 text-right">
                  <Money cents={totals.expense} />
                </td>
                <td className="px-3 py-3 text-right">
                  <Money cents={totals.net} sign />
                </td>
                <td className="tabular px-6 py-3 text-right">{rate === null ? "–" : percent(rate)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </>
  );
}

function InsightsSkeleton() {
  return (
    <div className="space-y-5 pt-2" aria-busy aria-label="Loading">
      <div className="flex justify-between">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-11 w-72 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-3xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-3xl" />
    </div>
  );
}
