"use client";

import { Sparkle } from "@phosphor-icons/react";
import { useId } from "react";

import { useI18n } from "@/i18n/client";

import { cn } from "./ui";

// The one icon for AI across Tally: Phosphor's four-point sparkle, filled
// with the cobalt -> magenta -> amber gradient (--ai-1..3, tuned per theme).
// Only AI features wear it, so it always means "AI did this".
export function AiMark({ size = 18, className, label }: { size?: number; className?: string; label?: string }) {
  const id = `ai-${useId().replace(/:/g, "")}`;
  return (
    <Sparkle
      size={size}
      weight="fill"
      color={`url(#${id})`}
      className={cn("shrink-0", className)}
      // Decorative next to words; announced as an image when it stands alone
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--ai-1)" />
          <stop offset="55%" stopColor="var(--ai-2)" />
          <stop offset="100%" stopColor="var(--ai-3)" />
        </linearGradient>
      </defs>
    </Sparkle>
  );
}

// A small "AI" tag next to things the AI wrote or decided
export function AiTag({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--ai-soft)] px-2 py-px text-xs font-medium text-ink-2", className)}>
      <AiMark size={12} />
      {children ?? t.ai.tag}
    </span>
  );
}
