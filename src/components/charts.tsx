"use client";

import { useState } from "react";

import { monthLabel, type MonthKey } from "@/lib/dates";
import { percent } from "@/lib/money";

import { Money, useMoney } from "./preferences";
import { cn } from "./ui";

// Charts are plain HTML/CSS: crisp at any width, themed by tokens, and each
// mark is a focusable element with an exact-value tooltip.
// Colors: --chart-income / --chart-expense (validated for colour-blind
// separation), and every series is also named in a legend.

export interface MonthPoint {
  key: MonthKey;
  income: number; // cents
  expense: number; // cents
}

function niceMax(value: number) {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const step = steps.find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span className="size-2.5 rounded-[3px]" style={{ background: item.color }} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

// Paired monthly bars: money in vs money out
export function CashFlowChart({
  points,
  height = 200,
  highlight,
  onSelect,
}: {
  points: MonthPoint[];
  height?: number;
  highlight?: MonthKey;
  onSelect?: (key: MonthKey) => void;
}) {
  const format = useMoney();
  const [active, setActive] = useState<MonthKey | null>(null);
  const max = niceMax(Math.max(...points.flatMap((p) => [p.income, p.expense]), 0) / 100) * 100;
  const ticks = [1, 0.5, 0];
  const empty = points.every((p) => p.income === 0 && p.expense === 0);

  return (
    <div>
      <div className="relative flex" style={{ height }}>
        {/* Y axis labels + recessive grid */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {ticks.map((t) => (
            <div key={t} className="absolute right-0 left-0 flex items-center" style={{ bottom: `${t * 100}%` }}>
              <span className="tabular w-12 -translate-y-1/2 pr-2 text-right text-xs text-ink-3">
                {format(((max / 100) * t), { compact: true })}
              </span>
              <span className={cn("h-px flex-1 -translate-y-1/2", t === 0 ? "bg-line-strong" : "bg-line/70")} />
            </div>
          ))}
        </div>
        <div className="relative ml-12 flex flex-1 items-end gap-1 sm:gap-2">
          {points.map((p) => {
            const isActive = active === p.key;
            const dim = (active && !isActive) || (highlight && highlight !== p.key && !active);
            return (
              <button
                key={p.key}
                type="button"
                onMouseEnter={() => setActive(p.key)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(p.key)}
                onBlur={() => setActive(null)}
                onClick={() => onSelect?.(p.key)}
                aria-label={`${monthLabel(p.key)}: income ${format(p.income / 100)}, expenses ${format(p.expense / 100)}`}
                className={cn(
                  "group relative flex h-full flex-1 items-end justify-center gap-[2px] rounded-xl transition-opacity duration-200",
                  onSelect ? "cursor-pointer" : "cursor-default",
                  dim ? "opacity-45" : "opacity-100",
                )}
              >
                <span
                  className="w-full max-w-4 rounded-t-[4px] bg-chart-income transition-[height] duration-500 ease-out"
                  style={{ height: `${(p.income / max) * 100}%`, minHeight: p.income ? 2 : 0 }}
                />
                <span
                  className="w-full max-w-4 rounded-t-[4px] bg-chart-expense transition-[height] duration-500 ease-out"
                  style={{ height: `${(p.expense / max) * 100}%`, minHeight: p.expense ? 2 : 0 }}
                />
                {isActive ? (
                  <span
                    role="tooltip"
                    className="glass pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 w-max -translate-x-1/2 rounded-2xl px-3 py-2 text-left text-sm"
                  >
                    <span className="block font-medium text-ink">{monthLabel(p.key)}</span>
                    <span className="mt-1 flex items-center gap-2 text-ink-2">
                      <span className="size-2 rounded-[2px] bg-chart-income" /> In
                      <Money cents={p.income} className="ml-auto pl-4 font-medium text-ink" />
                    </span>
                    <span className="flex items-center gap-2 text-ink-2">
                      <span className="size-2 rounded-[2px] bg-chart-expense" /> Out
                      <Money cents={p.expense} className="ml-auto pl-4 font-medium text-ink" />
                    </span>
                    <span className="mt-1 flex items-center gap-2 border-t border-line pt-1 text-ink-2">
                      Net
                      <Money cents={p.income - p.expense} sign className="ml-auto pl-4 font-medium text-ink" />
                    </span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {empty ? (
          <p className="absolute inset-0 ml-12 flex items-center justify-center text-sm text-ink-2">
            Nothing logged in this period yet.
          </p>
        ) : null}
      </div>
      <div className="mt-2 ml-12 flex gap-1 sm:gap-2" aria-hidden>
        {points.map((p) => (
          <span
            key={p.key}
            className={cn(
              "flex-1 text-center text-xs",
              (highlight ?? active) === p.key ? "font-medium text-ink" : "text-ink-3",
            )}
          >
            {monthLabel(p.key, "short", false).slice(0, points.length > 8 ? 1 : 3)}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface CategorySlice {
  id: string | null;
  name: string;
  total: number; // cents
  count: number;
}

// Ranked horizontal bars: where the money went (or came from)
export function CategoryBars({
  rows,
  type,
  limit = 6,
  onSelect,
}: {
  rows: CategorySlice[];
  type: "income" | "expense";
  limit?: number;
  onSelect?: (id: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = rows.reduce((sum, r) => sum + r.total, 0);
  const shown = expanded ? rows : rows.slice(0, limit);
  const max = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div>
      <ul className="space-y-3.5">
        {shown.map((row) => {
          const share = total ? row.total / total : 0;
          const content = (
            <>
              <span className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className={cn("truncate", row.id === null ? "text-warn" : "text-ink")}>{row.name}</span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className="tabular text-xs text-ink-3">{percent(share)}</span>
                  <Money cents={row.total} className="font-medium" />
                </span>
              </span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full">
                <span
                  className={cn("block h-full rounded-full", type === "income" ? "bg-chart-income" : "bg-chart-expense")}
                  style={{ width: `${Math.max((row.total / max) * 100, 1.5)}%` }}
                />
              </span>
            </>
          );
          return (
            <li key={row.id ?? "none"}>
              {onSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(row.id)}
                  className="-mx-2 block w-[calc(100%+1rem)] rounded-2xl px-2 py-1 text-left transition-colors hover:bg-surface-2"
                >
                  {content}
                </button>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
      {rows.length > limit ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          {expanded ? "Show less" : `Show all ${rows.length}`}
        </button>
      ) : null}
    </div>
  );
}

// Month grid of daily spending, one hue light -> dark by amount
export function SpendingCalendar({
  monthKey,
  days,
  today,
}: {
  monthKey: MonthKey;
  days: Record<string, number>; // "2026-10-05" -> cents spent
  today?: string;
}) {
  const format = useMoney();
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // Monday first
  const max = Math.max(...Object.values(days), 0);
  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

  const level = (cents: number) => {
    if (!cents || !max) return 0;
    const r = cents / max;
    return r > 0.75 ? 4 : r > 0.45 ? 3 : r > 0.2 ? 2 : 1;
  };
  const fills = [
    "var(--surface-2)",
    "color-mix(in oklab, var(--chart-expense) 22%, var(--surface))",
    "color-mix(in oklab, var(--chart-expense) 45%, var(--surface))",
    "color-mix(in oklab, var(--chart-expense) 70%, var(--surface))",
    "var(--chart-expense)",
  ];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label={`Daily spending, ${monthLabel(monthKey)}`}>
        {weekdays.map((d, i) => (
          <span key={i} className="pb-1 text-center text-xs text-ink-3" aria-hidden>
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`pad-${i}`} aria-hidden />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const day = i + 1;
          const key = `${monthKey}-${String(day).padStart(2, "0")}`;
          const cents = days[key] ?? 0;
          const l = level(cents);
          const future = today ? key > today : false;
          return (
            <span
              key={key}
              role="gridcell"
              tabIndex={0}
              title={`${monthLabel(monthKey, "short", false)} ${day}: ${cents ? format(cents / 100) : "no spending"}`}
              aria-label={`${monthLabel(monthKey, "long", false)} ${day}: ${cents ? `spent ${format(cents / 100)}` : future ? "upcoming" : "no spending"}`}
              className={cn(
                "flex aspect-square items-center justify-center rounded-[10px] text-xs tabular transition-transform hover:scale-105",
                l >= 3 ? "text-white" : "text-ink-2",
                key === today && "ring-2 ring-ink ring-offset-2 ring-offset-surface",
                future && "opacity-40",
              )}
              style={{ background: fills[l] }}
            >
              {day}
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-ink-3" aria-hidden>
        Less
        {fills.map((f, i) => (
          <span key={i} className="size-3 rounded-[4px]" style={{ background: f }} />
        ))}
        More
      </div>
    </div>
  );
}
