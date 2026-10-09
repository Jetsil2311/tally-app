"use client";

import type { ReactNode } from "react";

import { useI18n } from "@/i18n/client";

// Loading-skeleton wrapper, announced as "Loading" in the user's language
export function Busy({ className, children }: { className?: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className={className} aria-busy aria-label={t.common.loading}>
      {children}
    </div>
  );
}
