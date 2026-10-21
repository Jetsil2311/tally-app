"use client";

import { useEffect, useState } from "react";

import { useI18n } from "@/i18n/client";

import { useViewer } from "./people-ui";
import { Money } from "./preferences";

// Home's total, remembered on this device. While Home loads, the last total
// seen is shown in its place (dimmed, with a "refreshing" mark), so the most
// important number is there at once instead of a grey bar. Per signed-in
// user, so someone else on the same browser never sees it. Browser storage
// can be unavailable (private mode): then it's simply the skeleton.

const keyOf = (userId: string) => `tally:last-total:${userId}`;

export function RememberTotal({ cents }: { cents: number }) {
  const { id } = useViewer();
  useEffect(() => {
    try {
      localStorage.setItem(keyOf(id), JSON.stringify({ cents }));
    } catch {}
  }, [id, cents]);
  return null;
}

export function LastTotal() {
  const { id } = useViewer();
  const { t } = useI18n();
  const [cents, setCents] = useState<number | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(keyOf(id)) ?? "null") as { cents?: unknown } | null;
      // Read once on mount: storage isn't React state
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (typeof saved?.cents === "number") setCents(saved.cents);
    } catch {}
  }, [id]);

  if (cents === null) return <span aria-hidden className="mt-3 block h-14 w-60 max-w-full animate-pulse rounded-2xl bg-white/15 motion-reduce:animate-none" />;
  return (
    <span className="mt-3 flex items-center gap-3">
      <Money
        cents={cents}
        className="font-display block truncate text-[clamp(2.4rem,12vw,3.25rem)] leading-none font-semibold tracking-[-0.045em] opacity-70 sm:text-[64px]"
      />
      <span className="sr-only">{t.common.loading}</span>
    </span>
  );
}
