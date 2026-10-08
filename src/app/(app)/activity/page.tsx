import { CaretLeft, CaretRight, MagnifyingGlass, Receipt } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { OpenQuickAdd } from "@/components/actions-bar";
import { ActivityFilters } from "@/components/activity-filters";
import { Money } from "@/components/preferences";
import { TransactionRow } from "@/components/transaction-row";
import { Card, cn, EmptyState, Skeleton } from "@/components/ui";
import { activityHref, type ActivityQuery } from "@/lib/activity-query";
import { getAccounts, getAllTransactions, getCategories } from "@/lib/data";
import { currentMonthKey, dayKey, monthLabel, monthRange, parseMonthKey, shiftMonth, type MonthKey } from "@/lib/dates";
import { isTransfer } from "@/lib/insights";
import { toCents } from "@/lib/money";
import { getPreferences, requestTime } from "@/lib/session";
import type { Transaction } from "@/lib/types";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage({ searchParams }: PageProps<"/activity">) {
  return (
    <div className="space-y-5">
      <h1 className="rise pt-2 text-[28px] font-semibold tracking-tight sm:text-[32px]">Activity</h1>
      <Suspense fallback={<ActivitySkeleton />}>
        <Activity searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

async function Activity({ searchParams }: { searchParams: PageProps<"/activity">["searchParams"] }) {
  const params = await searchParams;
  const { timeZone } = await getPreferences();
  const now = await requestTime();
  const current = currentMonthKey(timeZone, now);
  const rawMonth = single(params.month);
  const month: MonthKey | "all" = rawMonth === "all" ? "all" : parseMonthKey(rawMonth) ? (rawMonth as MonthKey) : current;
  const type = single(params.type);
  const query: ActivityQuery = {
    month: month === current ? "" : month,
    q: single(params.q) || undefined,
    type: type === "income" || type === "expense" ? type : undefined,
    account: single(params.account) || undefined,
    category: single(params.category) || undefined,
    filter: single(params.filter) === "uncategorized" ? "uncategorized" : undefined,
  };

  const range = month === "all" ? {} : monthRange(month, timeZone);
  const [accounts, categories, result] = await Promise.all([
    getAccounts(true),
    getCategories(),
    getAllTransactions(
      {
        ...range,
        type: query.type,
        accountId: query.account,
        categoryId: query.category,
        search: query.q,
      },
      month === "all" ? 600 : 2000,
    ),
  ]);

  let rows = result.rows;
  if (query.filter === "uncategorized") rows = rows.filter((tx) => !tx.category && tx.source !== "opening");

  // Totals for what's on screen. Transfers between your own accounts are left out.
  let income = 0;
  let expense = 0;
  for (const tx of rows) {
    if (isTransfer(tx)) continue;
    if (tx.type === "income") income += toCents(tx.amount);
    else expense += toCents(tx.amount);
  }

  const groups = groupByDay(rows, timeZone);
  const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  const today = dayKey(now, timeZone);
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000), timeZone);
  const filtered = Boolean(query.q || query.type || query.account || query.category || query.filter);

  return (
    <>
      <ActivityFilters query={query} accounts={accounts} categories={categories} />

      <div className="flex flex-wrap items-center gap-3">
        <MonthSwitcher month={month} current={current} query={query} />
      </div>

      <dl className="rise grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "In", cents: income, tone: "text-income" },
          { label: "Out", cents: expense, tone: "text-ink" },
          { label: "Net", cents: income - expense, tone: income - expense < 0 ? "text-expense" : "text-ink", sign: true },
        ].map((item) => (
          <div key={item.label} className="min-w-0 rounded-3xl border border-line bg-surface px-3.5 py-3 sm:px-5 sm:py-3.5">
            <dt className="text-sm text-ink-2">{item.label}</dt>
            <dd>
              <Money cents={item.cents} sign={item.sign} className={cn("block truncate text-[15px] font-semibold tracking-tight sm:text-xl", item.tone)} />
            </dd>
          </div>
        ))}
      </dl>

      {result.truncated ? (
        <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm text-ink-2">
          Showing the most recent {result.rows.length} entries. Pick a month to see everything in it.
        </p>
      ) : null}

      {groups.length === 0 ? (
        <Card>
          {filtered ? (
            <EmptyState icon={<MagnifyingGlass size={24} />} title="Nothing matches">
              Try another search, or clear the filters.
            </EmptyState>
          ) : (
            <EmptyState
              icon={<Receipt size={24} />}
              title={month === "all" ? "No entries yet" : `Nothing logged in ${monthLabel(month, "long", false)}`}
              action={<OpenQuickAdd>Add an entry</OpenQuickAdd>}
            >
              Log purchases as they happen, or catch up on the ones you remember.
            </EmptyState>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group, i) => {
            const [y, m, d] = group.day.split("-").map(Number);
            const label =
              group.day === today ? "Today" : group.day === yesterday ? "Yesterday" : dayFormat.format(new Date(Date.UTC(y, m - 1, d)));
            return (
              <section
                key={group.day}
                aria-label={label}
                className="rise"
                style={{ "--i": Math.min(i, 8) } as React.CSSProperties}
              >
                <div className="flex items-baseline justify-between px-2 pb-1.5">
                  <h2 className="text-sm font-medium text-ink-2">{label}</h2>
                  {group.spent ? (
                    <p className="text-sm text-ink-3">
                      Spent <Money cents={group.spent} />
                    </p>
                  ) : null}
                </div>
                <Card className="p-1.5 sm:p-2">
                  {group.rows.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} />
                  ))}
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function groupByDay(rows: Transaction[], timeZone: string) {
  const groups: { day: string; rows: Transaction[]; spent: number }[] = [];
  for (const tx of rows) {
    const day = dayKey(tx.date, timeZone);
    let group = groups[groups.length - 1];
    if (!group || group.day !== day) {
      group = { day, rows: [], spent: 0 };
      groups.push(group);
    }
    group.rows.push(tx);
    if (tx.type === "expense" && !isTransfer(tx)) group.spent += toCents(tx.amount);
  }
  return groups;
}

function MonthSwitcher({ month, current, query }: { month: MonthKey | "all"; current: MonthKey; query: ActivityQuery }) {
  const href = (m: string) => activityHref({ ...query, month: m === current ? "" : m });
  const base = month === "all" ? current : month;
  const next = shiftMonth(base, 1);
  const pill =
    "inline-flex h-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink";
  return (
    <nav aria-label="Month" className="flex w-full items-center gap-1 sm:w-auto">
      <Link href={href(shiftMonth(base, -1))} aria-label="Previous month" className={cn(pill, "w-11")}>
        <CaretLeft size={18} />
      </Link>
      <p className="min-w-40 flex-1 text-center text-[17px] font-semibold tracking-tight sm:flex-none" aria-live="polite">
        {month === "all" ? "All time" : monthLabel(month)}
      </p>
      {next <= current ? (
        <Link href={href(next)} aria-label="Next month" className={cn(pill, "w-11")}>
          <CaretRight size={18} />
        </Link>
      ) : (
        <span className={cn(pill, "w-11 opacity-30")} aria-hidden>
          <CaretRight size={18} />
        </span>
      )}
      <Link
        href={href(month === "all" ? current : "all")}
        className={cn(pill, "ml-1 border border-line px-4 text-sm font-medium", month === "all" && "border-ink bg-ink text-surface hover:bg-ink hover:text-surface")}
      >
        All time
      </Link>
    </nav>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-5" aria-busy aria-label="Loading">
      <Skeleton className="h-12 w-full rounded-full" />
      <Skeleton className="h-11 w-64 rounded-full" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-20 rounded-3xl" />
      </div>
      <Skeleton className="h-72 rounded-3xl" />
    </div>
  );
}
