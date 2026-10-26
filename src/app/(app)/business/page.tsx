import { CaretLeft, CaretRight, Package, Receipt, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { BusinessIntro, PosPanel, WorkspaceSettings } from "@/components/business-panels";
import { Busy } from "@/components/busy";
import { Money } from "@/components/preferences";
import { Card, SectionTitle, Skeleton, cn } from "@/components/ui";
import { WorkspaceIcon } from "@/components/workspace-switcher";
import { capitalize } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import type { Dictionary } from "@/i18n/dictionaries";
import { ApiError } from "@/lib/api";
import { getAccounts, getCurrentWorkspace, getPosConnection, getPosReport } from "@/lib/data";
import { currentMonthKey, daysInMonth, monthLabel, parseMonthKey, shiftMonth, todayParts, type MonthKey } from "@/lib/dates";
import { percent } from "@/lib/money";
import { getPreferences, requestTime } from "@/lib/session";
import type { PosDay, PosExpense, PosInventory, PosList, PosProduct, PosRegisterSession, PosSummary, Workspace } from "@/lib/types";

// A business workspace's own screen: its point of sale (connect, sync) and
// the reports the POS calculates (profit with ingredient cost, cash flow,
// products, inventory, cash register), read live for the chosen month.
// Everything else (accounts, activity, insights...) already shows only this
// workspace, like any other screen.

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.business };
}

export default function BusinessPage({ searchParams }: PageProps<"/business">) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <Suspense fallback={<BusinessSkeleton />}>
        <Business searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

async function Business({ searchParams }: { searchParams: PageProps<"/business">["searchParams"] }) {
  const { t } = await getI18n();
  const workspace = await getCurrentWorkspace();

  if (!workspace || workspace.type === "personal") {
    return (
      <>
        <Header title={t.nav.business} intro={t.business.intro} />
        <BusinessIntro />
      </>
    );
  }

  const [connection, accounts] = await Promise.all([getPosConnection(workspace.id), getAccounts()]);
  const params = await searchParams;

  return (
    <>
      <Header
        title={workspace.name ?? t.nav.business}
        // The POS's own name, when it says something the title doesn't
        intro={connection.connected && connection.businessName && connection.businessName !== workspace.name ? connection.businessName : t.business.intro}
        workspace={workspace}
      />
      {connection.connected ? (
        <Suspense fallback={<ReportsSkeleton />}>
          <Reports workspace={workspace} month={single(params.month)} />
        </Suspense>
      ) : null}
      <PosPanel workspace={workspace} connection={connection} accounts={accounts} />
      {workspace.role === "owner" ? <WorkspaceSettings workspace={workspace} /> : null}
    </>
  );
}

function Header({ title, intro, workspace }: { title: string; intro: string; workspace?: Workspace }) {
  return (
    <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-4">
        {workspace ? <WorkspaceIcon workspace={workspace} size={52} /> : null}
        <div className="min-w-0">
          <h1 className="rise truncate text-[32px] leading-[1.05] font-semibold sm:text-[40px]">{title}</h1>
          <p className="mt-1 max-w-[56ch] text-ink-2">{intro}</p>
        </div>
      </div>
    </div>
  );
}

// Each report on its own: one the POS can't answer right now shows a note
// instead of taking the page down
async function attempt<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

async function Reports({ workspace, month: rawMonth }: { workspace: Workspace; month: string | undefined }) {
  const { t, locale } = await getI18n();
  const { timeZone } = await getPreferences();
  const now = await requestTime();
  const current = currentMonthKey(timeZone, now);
  const month = parseMonthKey(rawMonth) && (rawMonth as MonthKey) <= current ? (rawMonth as MonthKey) : current;
  // POS ranges are café dates, inclusive; this month runs up to today
  const from = `${month}-01`;
  const lastDay = month === current ? todayParts(timeZone, now).day : daysInMonth(month);
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;

  const [summary, daily, products, inventory, register, expenses] = await Promise.all([
    attempt(getPosReport<PosSummary>(workspace.id, "summary", from, to)),
    attempt(getPosReport<PosList<PosDay>>(workspace.id, "daily", from, to)),
    attempt(getPosReport<PosList<PosProduct>>(workspace.id, "products", from, to)),
    attempt(getPosReport<PosInventory>(workspace.id, "inventory")),
    attempt(getPosReport<PosList<PosRegisterSession>>(workspace.id, "register", from, to)),
    attempt(getPosReport<PosList<PosExpense>>(workspace.id, "expenses")),
  ]);
  const currency = summary?.currency ?? workspace.currency;
  const label = capitalize(monthLabel(month, "long", true, locale));

  return (
    <>
      <MonthNav
        label={label}
        prevHref={`/business?month=${shiftMonth(month, -1)}`}
        nextHref={month < current ? `/business?month=${shiftMonth(month, 1)}` : null}
        t={t}
      />

      {summary ? <SummaryCards summary={summary} currency={currency} t={t} locale={locale} /> : <Unreachable t={t} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <Card className="p-5 sm:p-6 lg:col-span-7">
          <SectionTitle>{t.business.dailySales}</SectionTitle>
          {daily ? <DailyBars days={daily.data} currency={currency} t={t} locale={locale} /> : <Unreachable t={t} inline />}
        </Card>
        <Card className="p-5 sm:p-6 lg:col-span-5">
          <SectionTitle>{t.business.products}</SectionTitle>
          {products ? <Products products={products.data} currency={currency} t={t} locale={locale} /> : <Unreachable t={t} inline />}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <Card className="p-5 sm:p-6">
          <SectionTitle>{t.business.inventory}</SectionTitle>
          {inventory ? <Inventory inventory={inventory} t={t} /> : <Unreachable t={t} inline />}
        </Card>
        <Card className="p-5 sm:p-6">
          <SectionTitle>{t.business.register}</SectionTitle>
          {register ? <Register sessions={register.data} currency={currency} t={t} locale={locale} /> : <Unreachable t={t} inline />}
        </Card>
        <Card className="p-5 sm:p-6">
          <SectionTitle>{t.business.fixedExpenses}</SectionTitle>
          {expenses ? <Expenses expenses={expenses.data} currency={currency} t={t} locale={locale} /> : <Unreachable t={t} inline />}
        </Card>
      </div>
    </>
  );
}

function MonthNav({ label, prevHref, nextHref, t }: { label: string; prevHref: string; nextHref: string | null; t: Dictionary }) {
  const pill = "inline-flex size-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink";
  return (
    <nav aria-label={t.insights.period} className="-my-1 flex items-center justify-end">
      <Link href={prevHref} scroll={false} aria-label={t.insights.previousPeriod} className={pill}>
        <CaretLeft size={18} />
      </Link>
      <span className="min-w-36 text-center text-[15px] font-semibold" aria-live="polite">
        {label}
      </span>
      {nextHref ? (
        <Link href={nextHref} scroll={false} aria-label={t.insights.nextPeriod} className={pill}>
          <CaretRight size={18} />
        </Link>
      ) : (
        <span className={cn(pill, "opacity-30")} aria-hidden>
          <CaretRight size={18} />
        </span>
      )}
    </nav>
  );
}

function Unreachable({ t, inline }: { t: Dictionary; inline?: boolean }) {
  const body = (
    <p className="flex items-start gap-2 text-sm text-ink-2">
      <WarningCircle size={18} className="mt-0.5 shrink-0 text-expense" aria-hidden /> {t.business.unreachable}
    </p>
  );
  return inline ? body : <Card className="p-5">{body}</Card>;
}

function Stat({ label, value, note, tone, index }: { label: string; value: ReactNode; note?: ReactNode; tone?: string; index: number }) {
  return (
    <Card className="rise min-w-0 p-4 sm:p-5" style={{ "--i": index } as React.CSSProperties}>
      <p className="text-sm text-ink-2">{label}</p>
      <p className={cn("mt-1 truncate text-xl leading-tight font-semibold tracking-tight sm:text-[26px]", tone)}>{value}</p>
      {note ? <p className="mt-1 truncate text-sm text-ink-3">{note}</p> : null}
    </Card>
  );
}

function SummaryCards({ summary, currency, t, locale }: { summary: PosSummary; currency: string; t: Dictionary; locale: string }) {
  const net = Number(summary.netProfit);
  const cashNet = Number(summary.cashFlow.net);
  const revenue = Number(summary.revenue);
  const share = (value: string) => (revenue > 0 ? Number(value) / revenue : 0);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat index={0} label={t.business.revenue} value={<Money value={summary.revenue} currency={currency} />} note={t.business.orders(summary.orders)} tone="text-income" />
        <Stat index={1} label={t.business.averageTicket} value={<Money value={summary.averageTicket} currency={currency} />} />
        <Stat
          index={2}
          label={t.business.grossProfit}
          value={<Money value={summary.grossProfit} currency={currency} />}
          note={t.business.margin(percent(summary.grossMarginPercent / 100, locale, 1))}
        />
        <Stat
          index={3}
          label={t.business.netProfit}
          value={<Money value={summary.netProfit} currency={currency} sign />}
          note={t.business.netProfitHint}
          tone={net < 0 ? "text-expense" : "text-ink"}
        />
      </div>

      {Number(summary.revenueWithoutRecipe) > 0 ? (
        <p className="flex items-start gap-2 rounded-2xl bg-surface-2 p-3.5 text-sm text-ink-2">
          <WarningCircle size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <span>{t.business.withoutRecipe(<Money value={summary.revenueWithoutRecipe} currency={currency} />)}</span>
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
        <Card className="p-5 sm:p-6">
          <SectionTitle>{t.business.netProfit}</SectionTitle>
          <Rows
            rows={[
              { label: t.business.revenue, value: <Money value={summary.revenue} currency={currency} /> },
              { label: t.business.ingredientCost, value: <Money value={-Number(summary.ingredientCost)} currency={currency} sign /> },
              { label: t.business.fixedCosts, value: <Money value={-Number(summary.fixedCosts)} currency={currency} sign /> },
            ]}
            total={{ label: t.business.netProfit, value: <Money value={summary.netProfit} currency={currency} sign />, negative: net < 0 }}
          />
        </Card>
        <Card className="p-5 sm:p-6">
          <SectionTitle>{t.business.cashFlow}</SectionTitle>
          <Rows
            rows={[
              { label: t.business.moneyIn, value: <Money value={summary.cashFlow.moneyIn} currency={currency} /> },
              { label: t.business.purchases, value: <Money value={-Number(summary.cashFlow.ingredientPurchases)} currency={currency} sign /> },
              { label: t.business.fixedDue, value: <Money value={-Number(summary.cashFlow.fixedExpensesDue)} currency={currency} sign /> },
            ]}
            total={{ label: t.business.net, value: <Money value={summary.cashFlow.net} currency={currency} sign />, negative: cashNet < 0 }}
          />
          <p className="mt-4 text-sm text-ink-3">{t.business.cashFlowHint}</p>
        </Card>
      </div>

      {revenue > 0 ? (
        <Card className="p-5 sm:p-6">
          <SectionTitle>{t.business.paidWith}</SectionTitle>
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <span className="bg-income" style={{ width: `${share(summary.paidWith.cash) * 100}%` }} />
            <span className="bg-accent" style={{ width: `${share(summary.paidWith.card) * 100}%` }} />
            <span className="bg-[var(--ai-2)]" style={{ width: `${share(summary.paidWith.rewards) * 100}%` }} />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            {[
              { label: t.business.cash, value: summary.paidWith.cash, dot: "bg-income" },
              { label: t.business.card, value: summary.paidWith.card, dot: "bg-accent" },
              { label: t.business.rewards, value: summary.paidWith.rewards, dot: "bg-[var(--ai-2)]" },
            ].map((item) => (
              <div key={item.label} className="min-w-0">
                <dt className="flex items-center gap-1.5 text-ink-2">
                  <span className={cn("size-2.5 rounded-full", item.dot)} aria-hidden /> {item.label}
                </dt>
                <dd className="mt-0.5 truncate font-medium">
                  <Money value={item.value} currency={currency} /> <span className="text-ink-3">· {percent(share(item.value), locale)}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}
    </>
  );
}

function Rows({ rows, total }: { rows: { label: string; value: ReactNode }[]; total: { label: string; value: ReactNode; negative: boolean } }) {
  return (
    <dl className="space-y-2.5 text-[15px]">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-2">{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-3 border-t border-line pt-2.5 font-semibold">
        <dt>{total.label}</dt>
        <dd className={total.negative ? "text-expense" : undefined}>{total.value}</dd>
      </div>
    </dl>
  );
}

function DailyBars({ days, currency, t, locale }: { days: PosDay[]; currency: string; t: Dictionary; locale: string }) {
  const max = Math.max(0, ...days.map((d) => Number(d.revenue)));
  if (max === 0) return <p className="py-8 text-center text-sm text-ink-2">{t.business.noSales}</p>;
  const dayLabel = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <div>
      <ol className="flex h-44 items-end gap-[3px]" aria-label={t.business.dailySales}>
        {days.map((day) => {
          const value = Number(day.revenue);
          const label = `${dayLabel.format(new Date(`${day.date}T00:00:00Z`))}: ${t.business.orders(day.orders)}`;
          return (
            <li key={day.date} className="group relative flex h-full min-w-0 flex-1 items-end" title={label}>
              <span
                className={cn("w-full rounded-t-[4px] transition-colors", value > 0 ? "bg-accent/70 group-hover:bg-accent" : "bg-surface-3")}
                style={{ height: `${Math.max(value > 0 ? 4 : 2, (value / max) * 100)}%` }}
              />
              <span className="sr-only">
                {label} <Money value={day.revenue} currency={currency} />
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-2 flex justify-between text-xs text-ink-3" aria-hidden>
        <span>{days[0] ? dayLabel.format(new Date(`${days[0].date}T00:00:00Z`)) : null}</span>
        <span>
          <Money value={max} currency={currency} compact />
        </span>
        <span>{days.at(-1) ? dayLabel.format(new Date(`${days.at(-1)!.date}T00:00:00Z`)) : null}</span>
      </div>
    </div>
  );
}

function Products({ products, currency, t, locale }: { products: PosProduct[]; currency: string; t: Dictionary; locale: string }) {
  if (products.length === 0) return <p className="py-8 text-center text-sm text-ink-2">{t.business.noSales}</p>;
  const top = products.slice(0, 8);
  const max = Number(top[0]?.revenue ?? 0) || 1;
  return (
    <ul className="space-y-3">
      {top.map((product) => (
        <li key={product.productId ?? product.name}>
          <div className="flex items-baseline justify-between gap-3 text-[15px]">
            <span className="min-w-0 truncate font-medium">{product.name}</span>
            <Money value={product.revenue} currency={currency} className="shrink-0" />
          </div>
          <div className="mt-1 flex items-center gap-3">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
              <span className="block h-full rounded-full bg-accent" style={{ width: `${(Number(product.revenue) / max) * 100}%` }} />
            </span>
            <span className="shrink-0 text-xs text-ink-3">
              {t.business.sold(product.quantitySold)} ·{" "}
              {product.marginPercent === null ? t.business.noRecipe : t.business.margin(percent(product.marginPercent / 100, locale))}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Inventory({ inventory, t }: { inventory: PosInventory; t: Dictionary }) {
  const attention = inventory.items.filter((item) => item.status !== "ok").sort((a, b) => (a.status === b.status ? 0 : a.status === "out" ? -1 : 1));
  return (
    <div>
      <p className="text-sm text-ink-2">{t.business.inventoryValue(<Money value={inventory.totalValue} currency={inventory.currency} />)}</p>
      {attention.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-ink-2">
          <Package size={18} className="text-income" aria-hidden /> {t.business.allStocked}
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm font-medium text-expense">{t.business.lowStock(attention.length)}</p>
          <ul className="mt-2 space-y-2">
            {attention.slice(0, 6).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-[15px]">
                <span className="min-w-0 truncate">{item.name}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    item.status === "out" ? "bg-expense-soft text-expense" : "bg-surface-3 text-ink-2",
                  )}
                >
                  {item.status === "out" ? t.business.out : `${t.business.low} · ${item.inStock} ${item.unit}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Register({ sessions, currency, t, locale }: { sessions: PosRegisterSession[]; currency: string; t: Dictionary; locale: string }) {
  if (sessions.length === 0) return <p className="text-sm text-ink-2">{t.business.noSessions}</p>;
  const dayLabel = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <ul className="space-y-3">
      {sessions.slice(0, 5).map((session) => {
        const difference = session.difference === null ? null : Number(session.difference);
        return (
          <li key={session.date} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium">{capitalize(dayLabel.format(new Date(`${session.date}T00:00:00Z`)))}</p>
              <p className="text-xs text-ink-3">
                {t.business.expected} <Money value={session.expectedCash} currency={currency} />
                {session.countedCash !== null ? (
                  <>
                    {" "}
                    · {t.business.counted} <Money value={session.countedCash} currency={currency} />
                  </>
                ) : null}
              </p>
            </div>
            {difference === null ? (
              <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-ink-2">{t.business.open}</span>
            ) : (
              <Money
                value={difference}
                currency={currency}
                sign
                className={cn("shrink-0 text-sm font-semibold", difference < 0 ? "text-expense" : difference > 0 ? "text-income" : "text-ink-2")}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Expenses({ expenses, currency, t, locale }: { expenses: PosExpense[]; currency: string; t: Dictionary; locale: string }) {
  if (expenses.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-2">
        <Receipt size={18} aria-hidden /> –
      </p>
    );
  }
  const total = expenses.reduce((sum, e) => sum + Number(e.equivalents.monthly), 0);
  const dateLabel = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <div>
      <p className="text-sm text-ink-2">{t.business.perMonth(<Money value={total} currency={currency} />)}</p>
      <ul className="mt-3 space-y-2.5">
        {[...expenses]
          .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
          .slice(0, 6)
          .map((expense) => (
            <li key={expense.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium">{expense.name}</p>
                <p className="text-xs text-ink-3">
                  {t.business.frequency[expense.frequency] ?? expense.frequency} · {t.business.nextDue(dateLabel.format(new Date(`${expense.nextDueDate}T00:00:00Z`)))}
                </p>
              </div>
              <Money value={expense.amount} currency={currency} className="shrink-0 text-sm" />
            </li>
          ))}
      </ul>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="busy space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-3xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-52 rounded-3xl" />
        <Skeleton className="h-52 rounded-3xl" />
      </div>
      <Skeleton className="h-64 rounded-3xl" />
    </div>
  );
}

function BusinessSkeleton() {
  return (
    <Busy topic="business" className="space-y-6 pt-2">
      <div className="flex items-center gap-4">
        <Skeleton className="size-13 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </div>
      <ReportsSkeleton />
      <Skeleton className="h-56 rounded-3xl" />
    </Busy>
  );
}
