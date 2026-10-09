"use client";

import { ArrowDown, ArrowsLeftRight, ArrowUp } from "@phosphor-icons/react";

import { useI18n } from "@/i18n/client";

import { useQuickAdd } from "./quick-add";
import { Button, cn } from "./ui";

// The three ways money moves, as one row of big targets
export function QuickActions({ className }: { className?: string }) {
  const { open } = useQuickAdd();
  const { t } = useI18n();
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button onClick={() => open({ mode: "expense" })}>
        <ArrowUp size={18} weight="bold" /> {t.common.expense}
      </Button>
      <Button variant="secondary" onClick={() => open({ mode: "income" })}>
        <ArrowDown size={18} weight="bold" /> {t.common.income}
      </Button>
      <Button variant="secondary" onClick={() => open({ mode: "transfer" })}>
        <ArrowsLeftRight size={18} weight="bold" /> {t.common.transfer}
      </Button>
    </div>
  );
}

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
