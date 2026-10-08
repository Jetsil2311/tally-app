import { ArrowRight, Check, Sparkle, Tag, TrendDown, TrendUp, Wallet, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AccountCard } from "@/components/account-card";
import { QuickActions, OpenQuickAdd } from "@/components/actions-bar";
import { CashFlowChart, CategoryBars, SpendingCalendar } from "@/components/charts";
import { Money } from "@/components/preferences";
import { TransactionRow } from "@/components/transaction-row";
import { buttonClass, Card, cn, EmptyState, SectionTitle, Skeleton } from "@/components/ui";
import {
  getAccounts,
  getAllTransactions,
  getCategories,
  getCurrentUser,
  getMonthSeries,
  getSummary,
  getTransactionPage,
} from "@/lib/data";
import { currentMonthKey, dayKey, daysInMonth, monthLabel, monthRange, shiftMonth, todayParts } from "@/lib/dates";
import { change, isTransfer, rollUpCategories, savingsRate, totalsFromSummary } from "@/lib/insights";
import { percent, toCents } from "@/lib/money";
import { getPreferences, requestTime } from "@/lib/session";

export const metadata: Metadata = { title: "Home" };

export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const { timeZone } = await getPreferences();
  const now = await requestTime();
  const monthKey = currentMonthKey(timeZone, now);
  const range = monthRange(monthKey, timeZone);
  const prevRange = monthRange(shiftMonth(monthKey, -1), timeZone);

  const [user, accounts, categories, summary, prevSummary, series, month, recent] = await Promise.all([
    getCurrentUser(),
    getAccounts(),
    getCategories(),
    getSummary(range.from, range.to),
    getSummary(prevRange.from, prevRange.to),
    getMonthSeries(monthKey, 6, timeZone),
    getAllTransactions({ from: range.from, to: range.to }),
    getTransactionPage({ limit: 6 }),
  ]);

  const firstName = user.name?.split(" ")[0];
  const hour = todayParts(timeZone, now).hour;
  const greeting = hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (accounts.length === 0) {
    return <Welcome name={firstName} hasCategories={categories.length > 0} />;
  }

  const totals = totalsFromSummary(summary);
  const prev = totalsFromSummary(prevSummary);
  const netWorth = accounts.reduce((sum, a) => sum + toCents(a.balance), 0);
  const owed = accounts.filter((a) => a.type === "creditCard").reduce((sum, a) => sum + Math.min(toCents(a.balance), 0), 0);
  const available = accounts.filter((a) => a.type !== "creditCard").reduce((sum, a) => sum + toCents(a.balance), 0);

  // Spending by day, for the calendar and the pace estimate
  const today = dayKey(now, timeZone);
  const days: Record<string, number> = {};
  for (const tx of month.rows) {
    if (tx.type !== "expense" || isTransfer(tx)) continue;
    const key = dayKey(tx.date, timeZone);
    days[key] = (days[key] ?? 0) + toCents(tx.amount);
  }
  const dayOfMonth = todayParts(timeZone, now).day;
  const totalDays = daysInMonth(monthKey);
  const dailyAverage = totals.expense / dayOfMonth;
  const projected = Math.round(dailyAverage * totalDays);
  const spentToday = days[today] ?? 0;
  const expenseChange = change(totals.expense, prev.expense);
  const rate = savingsRate(totals.income, totals.expense);

  const topCategories = rollUpCategories(totals.byCategory, categories, "expense");
  const uncategorized = month.rows.filter((tx) => !tx.category && tx.source !== "opening");

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="rise flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-2">{monthLabel(monthKey)}</p>
          <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight sm:text-[32px]">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <QuickActions className="hidden sm:flex" />
      </header>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        {/* Net balance: the one number that matters most */}
        <section
          className="rise relative overflow-hidden rounded-3xl bg-[linear-gradient(150deg,#2b48e8_0%,#1e33b8_55%,#16257f_100%)] p-6 text-white shadow-soft sm:p-7 lg:col-span-7"
          style={{ "--i": 1 } as React.CSSProperties}
          aria-labelledby="net-title"
        >
          <span aria-hidden className="pointer-events-none absolute -right-24 -bottom-32 size-80 rounded-full bg-white/10 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute top-0 right-0 h-full w-1/2 bg-[radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.18),transparent_55%)]" />
          <div className="relative flex h-full flex-col">
            <h2 id="net-title" className="text-sm text-white/75">
              Net balance across {accounts.length} {accounts.length === 1 ? "account" : "accounts"}
            </h2>
            <Money cents={netWorth} className="mt-2 block text-[44px] leading-none font-semibold tracking-tighter sm:text-[56px]" />
            <dl className="mt-6 grid grid-cols-2 gap-4 sm:max-w-md lg:mt-auto lg:pt-6">
              <div>
                <dt className="text-sm text-white/70">Cash & debit</dt>
                <dd>
                  <Money cents={available} className="text-lg font-medium" />
                </dd>
              </div>
              <div>
                <dt className="text-sm text-white/70">Credit owed</dt>
                <dd>
                  <Money cents={Math.abs(owed)} className="text-lg font-medium" />
                </dd>
              </div>
            </dl>
            <p className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-sm backdrop-blur-sm lg:mt-auto">
              {totals.net >= 0 ? <TrendUp size={16} weight="bold" /> : <TrendDown size={16} weight="bold" />}
              <Money cents={totals.net} sign className="font-medium" />
              <span className="text-white/75">net this month</span>
            </p>
          </div>
        </section>

        {/* This month at a glance */}
        <Card className="rise flex flex-col p-6 sm:p-7 lg:col-span-5" style={{ "--i": 2 } as React.CSSProperties}>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[17px] font-semibold tracking-tight">This month</h2>
            <Link href="/insights" className="text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline">
              Details
            </Link>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
            <div>
              <dt className="text-sm text-ink-2">Money in</dt>
              <dd>
                <Money cents={totals.income} className="text-2xl font-semibold tracking-tight text-income" />
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-2">Money out</dt>
              <dd>
                <Money cents={totals.expense} className="text-2xl font-semibold tracking-tight" />
              </dd>
              {expenseChange !== null ? (
                <dd className="mt-0.5 text-xs text-ink-2">
                  {expenseChange > 0 ? "▲" : "▼"} {percent(Math.abs(expenseChange))} vs {monthLabel(shiftMonth(monthKey, -1), "short", false)}
                </dd>
              ) : null}
            </div>
            <div>
              <dt className="text-sm text-ink-2">Left over</dt>
              <dd>
                <Money cents={totals.net} sign className={cn("text-lg font-medium", totals.net < 0 ? "text-expense" : "text-ink")} />
              </dd>
              {rate !== null ? <dd className="text-xs text-ink-2">{percent(rate)} of income saved</dd> : null}
            </div>
            <div>
              <dt className="text-sm text-ink-2">Spent today</dt>
              <dd>
                <Money cents={spentToday} className="text-lg font-medium" />
              </dd>
              <dd className="text-xs text-ink-2">
                ~<Money cents={Math.round(dailyAverage)} /> a day
              </dd>
            </div>
          </dl>
          <p className="mt-auto pt-5 text-sm leading-relaxed text-ink-2">
            At this pace you&apos;ll spend about <Money cents={projected} className="font-medium text-ink" /> by the end of{" "}
            {monthLabel(monthKey, "long", false)}.
          </p>
        </Card>
      </div>

      {uncategorized.length > 0 ? (
        <Link
          href="/activity?filter=uncategorized"
          className="rise flex items-center gap-3 rounded-3xl border border-warn/25 bg-warn-soft px-5 py-4 transition-colors hover:border-warn/50"
          style={{ "--i": 3 } as React.CSSProperties}
        >
          <WarningCircle size={22} weight="fill" className="shrink-0 text-warn" />
          <p className="flex-1 text-[15px]">
            <span className="font-medium">
              {uncategorized.length} {uncategorized.length === 1 ? "entry has" : "entries have"} no category
            </span>{" "}
            <span className="text-ink-2">this month. Sort them so your reports stay complete.</span>
          </p>
          <ArrowRight size={18} className="shrink-0 text-ink-2" />
        </Link>
      ) : null}

      <section aria-labelledby="accounts-title" className="rise" style={{ "--i": 3 } as React.CSSProperties}>
        <SectionTitle
          id="accounts-title"
          action={
            <Link href="/accounts" className="text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline">
              Manage
            </Link>
          }
        >
          Accounts
        </SectionTitle>
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6">
          {accounts.map((account) => (
            <div key={account.id} className="w-[78%] shrink-0 snap-start sm:w-72">
              <AccountCard account={account} href={`/activity?account=${account.id}`} />
            </div>
          ))}
          <Link
            href="/accounts?new=1"
            className="flex min-h-40 w-40 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-line-strong text-ink-2 transition-colors hover:border-accent hover:text-accent"
          >
            <Wallet size={24} />
            <span className="text-sm font-medium">New account</span>
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <Card className="rise p-6 lg:col-span-7" style={{ "--i": 4 } as React.CSSProperties} aria-labelledby="flow-title">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 id="flow-title" className="text-[17px] font-semibold tracking-tight">
              Cash flow, last 6 months
            </h2>
            <ul className="flex items-center gap-4 text-sm text-ink-2">
              <li className="flex items-center gap-2">
                <span className="size-2.5 rounded-[3px] bg-chart-income" aria-hidden /> In
              </li>
              <li className="flex items-center gap-2">
                <span className="size-2.5 rounded-[3px] bg-chart-expense" aria-hidden /> Out
              </li>
            </ul>
          </div>
          <CashFlowChart
            highlight={monthKey}
            points={series.map(({ key, summary }) => {
              const t = totalsFromSummary(summary);
              return { key: key as typeof monthKey, income: t.income, expense: t.expense };
            })}
          />
        </Card>

        <Card className="rise p-6 lg:col-span-5" style={{ "--i": 5 } as React.CSSProperties}>
          <SectionTitle>Where it went</SectionTitle>
          {topCategories.length ? (
            <CategoryBars rows={topCategories} type="expense" limit={5} />
          ) : (
            <EmptyState icon={<Tag size={24} />} title="No spending yet this month" className="py-6">
              Your top categories will show up here as you log expenses.
            </EmptyState>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <Card className="rise p-6 lg:col-span-5" style={{ "--i": 6 } as React.CSSProperties}>
          <SectionTitle>Daily spending</SectionTitle>
          <SpendingCalendar monthKey={monthKey} days={days} today={today} />
        </Card>

        <Card className="rise p-3 sm:p-4 lg:col-span-7" style={{ "--i": 7 } as React.CSSProperties}>
          <div className="px-3 pt-2">
            <SectionTitle
              action={
                <Link href="/activity" className="text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                  See all
                </Link>
              }
            >
              Recent activity
            </SectionTitle>
          </div>
          {recent.data.length ? (
            <div className="-mt-1">
              {recent.data.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} showDate />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Sparkle size={24} />}
              title="Your ledger is empty"
              action={<OpenQuickAdd>Log your first expense</OpenQuickAdd>}
            >
              Press N anywhere to add an entry. Each one takes a few seconds.
            </EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}

function Welcome({ name, hasCategories }: { name?: string; hasCategories: boolean }) {
  const steps = [
    {
      done: false,
      title: "Add where your money lives",
      body: "Your wallet, your bank card, your credit card. Each gets its own balance.",
      href: "/accounts?new=1",
      cta: "Add an account",
    },
    {
      done: hasCategories,
      title: "Pick your categories",
      body: "Start from a ready-made set or make your own, with subcategories.",
      href: "/categories",
      cta: hasCategories ? "Review categories" : "Set up categories",
    },
    {
      done: false,
      title: "Log every move",
      body: "Press N for an expense, I for income, T for a transfer. On your phone, tap +.",
      href: null,
      cta: null,
    },
  ];
  return (
    <div className="grid gap-6 pt-4 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pt-10">
      <div className="rise">
        <h1 className="text-[34px] leading-[1.1] font-semibold tracking-tight sm:text-5xl">
          Welcome{name ? `, ${name}` : ""}.
          <br />
          <span className="text-ink-2">Let&apos;s find every cent.</span>
        </h1>
        <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-ink-2">
          Three short steps and you&apos;ll see exactly where your money comes from and where it goes, month by month and
          year by year.
        </p>
      </div>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step.title} className="rise" style={{ "--i": i + 1 } as React.CSSProperties}>
            <Card className="flex gap-4 p-5">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  step.done ? "bg-income-soft text-income" : "bg-surface-3 text-ink",
                )}
              >
                {step.done ? <Check size={18} weight="bold" /> : i + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium">{step.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{step.body}</p>
                {step.href ? (
                  <Link href={step.href} className={cn(buttonClass(i === 0 ? "primary" : "secondary", "sm"), "mt-3")}>
                    {step.cta}
                  </Link>
                ) : null}
              </div>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-6 pt-2" aria-busy aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <Skeleton className="h-64 rounded-3xl lg:col-span-7" />
        <Skeleton className="h-64 rounded-3xl lg:col-span-5" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        <Skeleton className="h-40 w-72 shrink-0 rounded-3xl" />
        <Skeleton className="h-40 w-72 shrink-0 rounded-3xl" />
        <Skeleton className="h-40 w-72 shrink-0 rounded-3xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <Skeleton className="h-72 rounded-3xl lg:col-span-7" />
        <Skeleton className="h-72 rounded-3xl lg:col-span-5" />
      </div>
    </div>
  );
}
