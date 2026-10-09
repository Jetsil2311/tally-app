"use client";

import { CalendarBlank, CalendarDots, CaretLeft, CaretRight } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useI18n } from "@/i18n/client";

import { CashFlowChart, CategoryBars, type CategorySlice, type MonthPoint } from "./charts";
import { Segmented } from "./chips";
import { cn } from "./ui";

export function InsightsHeader({
  view,
  label,
  prevHref,
  nextHref,
  monthHref,
  yearHref,
}: {
  view: "month" | "year";
  label: string;
  prevHref: string;
  nextHref: string | null;
  monthHref: string;
  yearHref: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const pill = "inline-flex size-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink";
  return (
    <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between" aria-busy={pending}>
      <div className="flex items-center gap-3">
        <h1 className="text-[28px] font-semibold tracking-tight sm:text-[32px]">{t.nav.insights}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label={t.insights.period}
          value={view}
          onChange={(v) => startTransition(() => router.push(v === "month" ? monthHref : yearHref, { scroll: false }))}
          options={[
            { value: "month", label: t.insights.monthly, icon: <CalendarBlank size={16} /> },
            { value: "year", label: t.insights.annual, icon: <CalendarDots size={16} /> },
          ]}
        />
        <nav aria-label={t.insights.period} className="flex items-center">
          <Link href={prevHref} scroll={false} aria-label={t.insights.previousPeriod} className={pill}>
            <CaretLeft size={18} />
          </Link>
          <span className="min-w-28 text-center text-[15px] font-semibold sm:min-w-36" aria-live="polite">
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
      </div>
    </div>
  );
}

// Year chart where clicking a month opens that month's view
export function YearChart({ points, year }: { points: MonthPoint[]; year: number }) {
  const router = useRouter();
  return (
    <CashFlowChart
      points={points}
      height={240}
      onSelect={(key) => router.push(`/insights?view=month&month=${key}`)}
      highlight={undefined}
      key={year}
    />
  );
}

// Category bars that jump to the matching transactions
export function CategoryDrilldown({
  rows,
  type,
  month,
  limit,
}: {
  rows: CategorySlice[];
  type: "income" | "expense";
  month?: string;
  limit?: number;
}) {
  const router = useRouter();
  return (
    <CategoryBars
      rows={rows}
      type={type}
      limit={limit}
      onSelect={(id) => {
        const params = new URLSearchParams({ month: month ?? "all", type });
        if (id) params.set("category", id);
        else params.set("filter", "uncategorized");
        router.push(`/activity?${params}`);
      }}
    />
  );
}
