"use client";

import { ArrowDown, ArrowsLeftRight, ArrowUp, Wallet } from "@phosphor-icons/react";
import Link from "next/link";

import { useI18n } from "@/i18n/client";

import { useAi } from "./ai-assist";
import { AiMark } from "./ai-mark";
import { useQuickAdd } from "./quick-add";
import { Button, cn } from "./ui";

export function OpenQuickAdd({
  mode = "expense",
  accountId,
  children,
  className,
  variant = "primary",
}: {
  mode?: "expense" | "income" | "transfer";
  accountId?: string;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const { open } = useQuickAdd();
  return (
    <Button variant={variant} className={className} onClick={() => open({ mode, accountId })}>
      {children}
    </Button>
  );
}

// Home's first row: everything you'd come to do, one tap each. Big icon
// tiles that sit five across even on a phone (labels truncate, never wrap).
export function HomeQuickActions() {
  const { open } = useQuickAdd();
  const { open: openAi } = useAi();
  const { t } = useI18n();
  const tile =
    "group flex min-w-0 flex-col items-center gap-2 rounded-3xl px-1 py-3 text-center text-xs font-medium transition-[background-color,transform] duration-200 hover:bg-surface-2 active:scale-[0.97] sm:flex-row sm:gap-3 sm:border sm:border-line sm:bg-surface sm:px-4 sm:text-left sm:text-[15px] sm:hover:border-line-strong";
  const circle = "flex size-12 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-105 sm:size-10";
  const label = "max-w-full truncate";
  return (
    <nav aria-label={t.home.quickActions} className="rise grid grid-cols-5 gap-1 sm:gap-3" style={{ "--i": 1 } as React.CSSProperties}>
      <button type="button" className={tile} onClick={() => open({ mode: "expense" })}>
        <span className={cn(circle, "bg-accent text-accent-ink")}>
          <ArrowUp size={20} weight="bold" aria-hidden />
        </span>
        <span className={label}>{t.common.expense}</span>
      </button>
      <button type="button" className={tile} onClick={() => open({ mode: "income" })}>
        <span className={cn(circle, "bg-income-soft text-income")}>
          <ArrowDown size={20} weight="bold" aria-hidden />
        </span>
        <span className={label}>{t.common.income}</span>
      </button>
      <button type="button" className={tile} onClick={() => open({ mode: "transfer" })}>
        <span className={cn(circle, "bg-surface-3 text-ink")}>
          <ArrowsLeftRight size={20} weight="bold" aria-hidden />
        </span>
        <span className={label}>{t.common.transfer}</span>
      </button>
      <Link href="/accounts?new=1" className={tile}>
        <span className={cn(circle, "bg-surface-3 text-ink")}>
          <Wallet size={20} weight="bold" aria-hidden />
        </span>
        <span className={label}>{t.home.newAccountShort}</span>
      </Link>
      <button type="button" className={tile} onClick={() => openAi()}>
        <span className={cn(circle, "ai-chip")}>
          <AiMark size={22} />
        </span>
        <span className={label}>{t.home.askAiShort}</span>
      </button>
    </nav>
  );
}
