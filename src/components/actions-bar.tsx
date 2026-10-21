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
    "group flex min-w-0 flex-col items-center gap-2 rounded-3xl px-1 py-2 text-center text-xs font-medium text-ink-2 transition-[color,transform,translate,scale,rotate,box-shadow] duration-300 ease-[var(--ease-out-expo)] hover:text-ink active:scale-[0.95] card-sm card-press sm:flex-row sm:gap-3 sm:px-3 sm:py-3 sm:text-left sm:text-[15px] sm:text-ink";
  const circle =
    "flex size-14 shrink-0 items-center justify-center rounded-[1.35rem] transition-[scale,rotate] duration-300 ease-[var(--ease-spring)] group-hover:scale-105 group-hover:-rotate-6 group-active:scale-95 sm:size-11 sm:rounded-2xl";
  const label = "max-w-full truncate";
  return (
    <nav aria-label={t.home.quickActions} className="rise grid grid-cols-5 gap-1 sm:gap-3" style={{ "--i": 1 } as React.CSSProperties}>
      <button type="button" className={tile} onClick={() => open({ mode: "expense" })}>
        <span className={cn(circle, "tactile")}>
          <ArrowUp size={20} weight="bold" aria-hidden />
        </span>
        <span className={label}>{t.common.expense}</span>
      </button>
      <button type="button" className={tile} onClick={() => open({ mode: "income" })}>
        <span className={cn(circle, "icon-tile text-income")}>
          <ArrowDown size={20} weight="bold" aria-hidden />
        </span>
        <span className={label}>{t.common.income}</span>
      </button>
      <button type="button" className={tile} onClick={() => open({ mode: "transfer" })}>
        <span className={cn(circle, "icon-tile text-accent")}>
          <ArrowsLeftRight size={20} weight="bold" aria-hidden />
        </span>
        <span className={label}>{t.common.transfer}</span>
      </button>
      <Link href="/accounts?new=1" className={tile}>
        <span className={cn(circle, "icon-tile text-[var(--chart-expense)]")}>
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
