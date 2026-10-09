import { ArrowDownRight, ArrowUpRight, ChartBar, TrendDown, TrendUp } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Busy } from "@/components/busy";
import { SpendingCalendar } from "@/components/charts";
import { CategoryDrilldown, InsightsHeader, YearChart } from "@/components/insights-controls";
import { Money } from "@/components/preferences";
import { TransactionRow } from "@/components/transaction-row";
import { Card, cn, EmptyState, SectionTitle, Skeleton } from "@/components/ui";
import type { Dictionary } from "@/i18n/dictionaries";
import { capitalize } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
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

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.insights };
}

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
  const { t, locale } = await getI18n();
  const now = await requestTime();
  const current = currentMonthKey(timeZone, now);
  const currentYear = todayParts(timeZone, now).year;

  if (single(params.view) === "year") {
    const raw = Number(single(params.year));
    const year = Number.isInteger(raw) && raw > 1970 && raw <= currentYear ? raw : currentYear;
    return <YearView year={year} currentYear={currentYear} current={current} timeZone={timeZone} t={t} locale={locale} />;
  }

  const raw = single(params.month);
  const month = parseMonthKey(raw) && (raw as MonthKey) <= current ? (raw as MonthKey) : current;
  return <MonthView month={month} current={current} timeZone={timeZone} now={now} t={t} locale={locale} />;
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
  locale,
}: {
  label: string;
  cents?: number;
  delta?: number | null;
  tone?: string;
  sign?: boolean;
  invert?: boolean; // for expenses, going up is bad
  note?: React.ReactNode;
  index: number;
  locale: string;
}) {
  const good = delta == null ? null : invert ? delta < 0 : delta > 0;
  return (
    <Card className="rise min-w-0 p-4 sm:p-5" style={{ "--i": index } as React.CSSProperties}>
      <p className="text-sm text-ink-2">{label}</p>
      {cents !== undefined ? (
        <Money cents={cents} sign={sign} className={cn("mt-1 block truncate text-xl leading-tight font-semibold tracking-tight sm:text-[26px]", tone)} />
      ) : null}
      {note ? <div className="mt-1">{note}</div> : null}
      {delta != null ? (
        <p className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", good ? "bg-income-soft text-income" : "bg-expense-soft text-expense")}>
          {delta > 0 ? <ArrowUpRight size={12} weight="bold" /> : <ArrowDownRight size={12} weight="bold" />}
          {percent(Math.abs(delta), locale)}
        </p>
      ) : null}
    </Card>
  );
}

async function MonthView({
  month,
  current,
  timeZone,
  now,
  t,
  locale,
}: {
  month: MonthKey;
  current: MonthKey;
  timeZone: string;
  now: Date;
  t: Dictionary;
  locale: string;
}) {
  const range = monthRange(month, timeZone);
  const prevKey = shiftMonth(month, -1);
  const prevRange = monthRange(prevKey, timeZone);
  const [summary, prevSummary, categories, txs] = await Promise.all([
    getSummary(range.from, range.to),
    getSummary(prevRange.from, prevRange.to),
    getCategories(),
    // Approved only: pending and rejected entries never count
    getAllTransactions({ from: range.from, to: range.to, status: "approved" }),
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
  const label = capitalize(monthLabel(month, "long", true, locale));

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
        <Kpi locale={locale} index={0} label={t.common.income} cents={totals.income} tone="text-income" delta={change(totals.income, prev.income)} />
        <Kpi locale={locale} index={1} label={t.common.expenses} cents={totals.expense} delta={change(totals.expense, prev.expense)} invert />
        <Kpi locale={locale} index={2} label={t.common.net} cents={totals.net} sign tone={totals.net < 0 ? "text-expense" : "text-ink"} />
        <Kpi
          locale={locale}
          index={3}
          label={t.insights.savingsRate}
          note={
            <p className="text-xl leading-tight font-semibold tracking-tight sm:text-[26px]">{rate === null ? "–" : percent(rate, locale)}</p>
          }
          delta={rate !== null && prevRate !== null ? rate - prevRate : null}
        />
      </div>
      <p className="-mt-1 text-sm text-ink-2">
        {t.insights.comparedWith(monthLabel(prevKey, "long", false, locale))}
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <Card className="rise p-6" style={{ "--i": 4 } as React.CSSProperties}>
          <SectionTitle>{t.insights.spendingByCategory}</SectionTitle>
          {spending.length ? (
            <CategoryDrilldown rows={spending} type="expense" month={month} limit={8} />
          ) : (
            <EmptyState icon={<ChartBar size={24} />} title={t.insights.noExpensesMonth} className="py-6" />
          )}
        </Card>
        <Card className="rise p-6" style={{ "--i": 5 } as React.CSSProperties}>
          <SectionTitle>{t.insights.incomeBySource}</SectionTitle>
          {earning.length ? (
            <CategoryDrilldown rows={earning} type="income" month={month} limit={8} />
          ) : (
            <EmptyState icon={<ChartBar size={24} />} title={t.insights.noIncomeMonth} className="py-6" />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <Card className="rise p-6 lg:col-span-5" style={{ "--i": 6 } as React.CSSProperties}>
          <SectionTitle>{t.insights.dayByDay}</SectionTitle>
          <SpendingCalendar monthKey={month} days={days} today={month === current ? dayKey(now, timeZone) : undefined} />
          <p className="mt-4 text-sm text-ink-2">
            {t.insights.spendDays(spendDays, elapsedDays, month === current)}
          </p>
        </Card>
        <Card className="rise p-3 sm:p-4 lg:col-span-7" style={{ "--i": 7 } as React.CSSProperties}>
          <div className="px-3 pt-2">
            <SectionTitle>{t.insights.biggestExpenses}</SectionTitle>
          </div>
          {biggest.length ? (
            biggest.map((tx) => <TransactionRow key={tx.id} tx={tx} showDate />)
          ) : (
            <p className="px-3 pb-4 text-sm text-ink-2">{t.insights.nothingYet}</p>
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
  t,
  locale,
}: {
  year: number;
  currentYear: number;
  current: MonthKey;
  timeZone: string;
  t: Dictionary;
  locale: string;
}) {
  const month = (key: MonthKey) => capitalize(monthLabel(key, "long", false, locale));
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
        <Kpi locale={locale} index={0} label={t.insights.incomeIn(year)} cents={totals.income} tone="text-income" delta={change(totals.income, prev.income)} />
        <Kpi locale={locale} index={1} label={t.insights.expensesIn(year)} cents={totals.expense} delta={change(totals.expense, prev.expense)} invert />
        <Kpi locale={locale} index={2} label={t.insights.perMonthAvg} cents={Math.round(totals.expense / elapsed)} />
        <Kpi
          locale={locale}
          index={3}
          label={t.insights.kept}
          cents={totals.net}
          sign
          tone={totals.net < 0 ? "text-expense" : "text-ink"}
          note={rate !== null ? <p className="text-sm text-ink-2">{t.insights.ofIncome(percent(rate, locale))}</p> : null}
        />
      </div>
      <p className="-mt-1 text-sm text-ink-2">{t.insights.comparedWith(String(year - 1))}</p>

      <Card className="rise p-6" style={{ "--i": 4 } as React.CSSProperties}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold tracking-tight">{t.insights.monthByMonth}</h2>
          <ul className="flex items-center gap-4 text-sm text-ink-2">
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px] bg-chart-income" aria-hidden /> {t.common.in}
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-[3px] bg-chart-expense" aria-hidden /> {t.common.out}
            </li>
          </ul>
        </div>
        <YearChart year={year} points={series.map(({ key, summary }) => {
          const t = totalsFromSummary(summary);
          return { key: key as MonthKey, income: t.income, expense: t.expense };
        })} />
        <p className="mt-4 text-sm text-ink-2">{t.insights.selectMonth}</p>
      </Card>

      {best || priciest ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {best ? (
            <Card className="rise flex items-center gap-4 p-5" style={{ "--i": 5 } as React.CSSProperties}>
              <span className="flex size-11 items-center justify-center rounded-full bg-income-soft text-income">
                <TrendUp size={22} />
              </span>
              <div>
                <p className="text-sm text-ink-2">{t.insights.bestMonth}</p>
                <p className="font-medium">{t.insights.keptIn(month(best.key), <Money cents={best.net} sign />)}</p>
              </div>
            </Card>
          ) : null}
          {priciest ? (
            <Card className="rise flex items-center gap-4 p-5" style={{ "--i": 6 } as React.CSSProperties}>
              <span className="flex size-11 items-center justify-center rounded-full bg-expense-soft text-expense">
                <TrendDown size={22} />
              </span>
              <div>
                <p className="text-sm text-ink-2">{t.insights.mostSpent}</p>
                <p className="font-medium">
                  {month(priciest.key)}, <Money cents={priciest.expense} />
                </p>
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <Card className="rise p-6" style={{ "--i": 7 } as React.CSSProperties}>
          <SectionTitle>{t.insights.whereYearWent(year)}</SectionTitle>
          {spending.length ? (
            <CategoryDrilldown rows={spending} type="expense" limit={8} />
          ) : (
            <EmptyState icon={<ChartBar size={24} />} title={t.insights.noExpensesYear} className="py-6" />
          )}
        </Card>
        <Card className="rise p-6" style={{ "--i": 8 } as React.CSSProperties}>
          <SectionTitle>{t.insights.whereItCameFrom}</SectionTitle>
          {earning.length ? (
            <CategoryDrilldown rows={earning} type="income" limit={8} />
          ) : (
            <EmptyState icon={<ChartBar size={24} />} title={t.insights.noIncomeYear} className="py-6" />
          )}
        </Card>
      </div>

      <Card className="rise overflow-hidden" style={{ "--i": 9 } as React.CSSProperties}>
        <div className="px-6 pt-6">
          <SectionTitle>{t.insights.monthlyBreakdown}</SectionTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[15px]">
            <thead>
              <tr className="text-left text-sm text-ink-2">
                <th scope="col" className="px-6 py-3 font-medium">{t.insights.month}</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">{t.common.in}</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">{t.common.out}</th>
                <th scope="col" className="px-3 py-3 text-right font-medium">{t.common.net}</th>
                <th scope="col" className="px-6 py-3 text-right font-medium">{t.insights.saved}</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => {
                const r = savingsRate(m.income, m.expense);
                return (
                  <tr key={m.key} className="border-t border-line transition-colors hover:bg-surface-2">
                    <th scope="row" className="px-6 py-3 text-left font-medium">
                      <Link href={`/insights?view=month&month=${m.key}`} className="underline-offset-4 hover:underline">
                        {month(m.key)}
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
                    <td className="tabular px-6 py-3 text-right text-ink-2">{r === null ? "–" : percent(r, locale)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line-strong font-semibold">
                <th scope="row" className="px-6 py-3 text-left">{t.common.total}</th>
                <td className="px-3 py-3 text-right">
                  <Money cents={totals.income} className="text-income" />
                </td>
                <td className="px-3 py-3 text-right">
                  <Money cents={totals.expense} />
                </td>
                <td className="px-3 py-3 text-right">
                  <Money cents={totals.net} sign />
                </td>
                <td className="tabular px-6 py-3 text-right">{rate === null ? "–" : percent(rate, locale)}</td>
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
    <Busy className="space-y-5 pt-2">
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
    </Busy>
  );
}
