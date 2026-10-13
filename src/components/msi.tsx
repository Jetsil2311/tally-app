"use client";

import { CalendarDots } from "@phosphor-icons/react";

import { useI18n } from "@/i18n/client";
import type { Installments } from "@/lib/types";

import { Money, usePreferences } from "./preferences";
import { Card, cn } from "./ui";

// MSI (meses sin intereses): how much of each coming month is already
// promised to installment plans, as one bar per month, and each plan's
// progress. A tall bar = a tight month, at a glance.
export function MsiCard({ installments }: { installments: Installments }) {
  const { t, locale } = useI18n();
  const { currency: preferred } = usePreferences();
  const r = t.recurring;
  // Plotted in one currency: the preferred one when plans use it, otherwise
  // the most common
  const currencies = installments.months.flatMap((m) => Object.keys(m.committed));
  const currency = currencies.includes(preferred) ? preferred : (currencies[0] ?? preferred);
  const months = installments.months.slice(0, 12).map((m) => ({ key: m.month, value: Number(m.committed[currency] ?? 0) }));
  const max = Math.max(...months.map((m) => m.value), 1);
  const label = (key: string) =>
    new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`)).replace(".", "");

  // How many of a plan's charges are already behind it
  const paidOf = (plan: Installments["plans"][number]) => {
    if (!plan.endDate) return 0;
    const next = new Date(plan.nextDueDate);
    const end = new Date(plan.endDate);
    const left = (end.getUTCFullYear() - next.getUTCFullYear()) * 12 + (end.getUTCMonth() - next.getUTCMonth()) + 1;
    return Math.min(Math.max(plan.totalInstallments - left, 0), plan.totalInstallments);
  };

  return (
    <Card className="rise p-5 sm:p-6" style={{ "--i": 1 } as React.CSSProperties} aria-labelledby="msi-title">
      <h2 id="msi-title" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
        <CalendarDots size={20} className="text-accent" aria-hidden /> {r.msi}
      </h2>

      {/* One bar per month; the first (next) one is labeled with its amount */}
      <div className="mt-5 flex h-28 items-end gap-1.5" role="img" aria-label={r.msiChart}>
        {months.map((m, i) => (
          <div key={m.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${label(m.key)}`}>
            <span
              className={cn("w-full rounded-t-lg", i === 0 ? "bg-accent" : "bg-accent/35")}
              style={{ height: `${m.value > 0 ? Math.max((m.value / max) * 100, 4) : 0}%` }}
            />
            <span className={cn("text-[10px] capitalize", i === 0 ? "font-semibold text-ink" : "text-ink-3")}>{label(m.key)}</span>
          </div>
        ))}
      </div>
      {months[0] ? (
        <p className="mt-3 text-sm text-ink-2">
          {r.msiNext(<Money value={months[0].value} currency={currency} className="font-semibold text-ink" />)}
        </p>
      ) : null}

      <ul className="mt-5 space-y-3 border-t border-line pt-4">
        {installments.plans.map((plan) => {
          const paid = paidOf(plan);
          return (
            <li key={plan.id}>
              <p className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className="truncate font-medium">{plan.name}</span>
                <span className="tabular shrink-0 text-sm text-ink-2">
                  <span className="font-semibold text-ink">{paid}</span>/{plan.totalInstallments} ·{" "}
                  <Money value={plan.amount} currency={plan.currency} />
                </span>
              </p>
              <div
                role="progressbar"
                aria-label={plan.name}
                aria-valuemin={0}
                aria-valuemax={plan.totalInstallments}
                aria-valuenow={paid}
                className="mt-2 flex gap-0.5"
              >
                {Array.from({ length: plan.totalInstallments }, (_, i) => (
                  <span key={i} className={cn("h-2 flex-1 rounded-full", i < paid ? "bg-income" : "bg-surface-3")} />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
