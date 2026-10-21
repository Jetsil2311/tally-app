"use client";

import type { ReactNode } from "react";

import { useI18n } from "@/i18n/client";

import { cn } from "./ui";
import { LoadingStatus, type LoadingTopic } from "./loading-status";

// A loading screen: the skeleton of what's coming (its blocks arrive top to
// bottom), announced as "Loading" in the user's language, with Buck naming
// what's being done once it takes more than a moment
export function Busy({ className, topic, children }: { className?: string; topic: LoadingTopic; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div aria-busy aria-label={t.common.loading}>
      <LoadingStatus topic={topic} />
      <div className={cn("busy", className)}>{children}</div>
    </div>
  );
}
