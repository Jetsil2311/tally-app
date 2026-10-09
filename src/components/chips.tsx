"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, type ReactNode } from "react";

import { cn } from "./ui";

// Radio group styled as pills; much faster to tap than a <select>.
export function ChipGroup<T extends string>({
  name,
  value,
  onChange,
  options,
  label,
  invalid,
  className,
}: {
  name: string;
  value: T | "";
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: ReactNode; meta?: ReactNode }[];
  label: string;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} aria-invalid={invalid} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[15px] transition-[background-color,border-color,color,transform] duration-200 select-none active:scale-[0.97]",
              "has-focus-visible:ring-4 has-focus-visible:ring-accent-soft",
              checked
                ? "border-ink bg-ink text-surface"
                : "border-line bg-surface-2 text-ink hover:border-line-strong",
              invalid && !checked && "border-expense/60",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon}
            <span>{option.label}</span>
            {option.meta ? <span className={checked ? "text-surface/70" : "text-ink-3"}>{option.meta}</span> : null}
          </label>
        );
      })}
    </div>
  );
}

// Segmented control with a sliding thumb (income / expense / transfer, month / year)
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      // minmax(0,1fr): equal columns that may shrink below their label, so
      // "Transferencia" truncates instead of widening the whole sheet
      className={cn("inline-grid auto-cols-[minmax(0,1fr)] grid-flow-col rounded-full bg-surface-3/70 p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full px-2 font-medium transition-colors duration-200 sm:px-4",
              size === "md" ? "h-10 text-sm sm:text-[15px]" : "h-8 text-sm",
              active ? "text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {active ? (
              <motion.span
                layoutId={`seg-${id}`}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-full bg-surface shadow-soft"
              />
            ) : null}
            <span className="relative inline-flex min-w-0 items-center gap-1.5">
              <span className="shrink-0">{option.icon}</span>
              <span className="truncate">{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
