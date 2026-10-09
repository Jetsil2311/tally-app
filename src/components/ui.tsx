import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import type { ComponentProps, ReactNode } from "react";

import { OptionalTag } from "./optional-tag";

// Shared presentational pieces. Shape rule: containers 24px, inputs 16px,
// anything pressable is a pill.

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover shadow-soft",
  secondary: "bg-surface-2 text-ink hover:bg-surface-3 border border-line",
  ghost: "text-ink-2 hover:text-ink hover:bg-surface-2",
  danger: "bg-expense text-white hover:opacity-90 dark:text-[#1a0a0e]",
};

export function buttonClass(variant: Variant = "primary", size: "sm" | "md" | "lg" = "md") {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium",
    "transition-[background-color,color,transform,opacity] duration-200 active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-45",
    size === "sm" && "h-9 px-3.5 text-sm",
    size === "md" && "h-11 px-5 text-[15px]",
    size === "lg" && "h-13 px-6 text-base",
    variants[variant],
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return <button className={cn(buttonClass(variant, size), className)} {...props} />;
}

export function IconButton({ label, className, ...props }: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors",
        "hover:bg-surface-2 hover:text-ink active:scale-95",
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-3xl border border-line bg-surface", className)} {...props} />;
}

export function SectionTitle({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 id={id} className="text-[17px] font-semibold tracking-tight text-ink">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">{icon}</div>
      <p className="text-base font-semibold text-ink">{title}</p>
      {children ? <p className="mt-1.5 max-w-[42ch] text-sm leading-relaxed text-ink-2">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

// Field wrapper: label above, helper or error below (error wins)
export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const messageId = htmlFor ? `${htmlFor}-message` : undefined;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-sm font-medium text-ink">
        {label}
        {optional ? <OptionalTag /> : null}
      </label>
      {children}
      {error ? (
        <p id={messageId} role="alert" className="text-sm text-expense">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-sm text-ink-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass = cn(
  "h-12 w-full rounded-2xl border border-line bg-surface-2 px-4 text-base text-ink",
  "placeholder:text-ink-3 transition-[border-color,box-shadow] duration-200",
  "hover:border-line-strong focus:border-accent focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent-soft",
  "aria-invalid:border-expense aria-invalid:ring-expense-soft",
);

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(inputClass, "appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <CaretDown aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-3" />
    </div>
  );
}

// Coloured, signed amount. Never relies on colour alone: always has +/-.
export function amountTone(type: "income" | "expense") {
  return type === "income" ? "text-income" : "text-ink";
}
