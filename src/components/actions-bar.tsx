"use client";

import { ArrowDown, ArrowsLeftRight, ArrowUp } from "@phosphor-icons/react";

import { useQuickAdd } from "./quick-add";
import { Button, cn } from "./ui";

// The three ways money moves, as one row of big targets
export function QuickActions({ className }: { className?: string }) {
  const { open } = useQuickAdd();
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button onClick={() => open({ mode: "expense" })}>
        <ArrowUp size={18} weight="bold" /> Expense
      </Button>
      <Button variant="secondary" onClick={() => open({ mode: "income" })}>
        <ArrowDown size={18} weight="bold" /> Income
      </Button>
      <Button variant="secondary" onClick={() => open({ mode: "transfer" })}>
        <ArrowsLeftRight size={18} weight="bold" /> Transfer
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
