"use client";

import { useI18n } from "@/i18n/client";

import { HomeQuickActions } from "./actions-bar";
import { Busy } from "./busy";
import { LastTotal } from "./last-total";
import { Card, Skeleton } from "./ui";

// Home while it loads. Everything that doesn't need data is already real:
// the quick actions work (you can log an expense right away) and the total
// card is there with the last total seen on this device. The rest are
// placeholders shaped like what's coming.
export function HomeSkeleton() {
  const { t } = useI18n();
  return (
    <Busy topic="home" className="space-y-5 sm:space-y-6">
      <div className="space-y-2 pt-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-72 max-w-full rounded-2xl" />
      </div>
      <HomeQuickActions />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <section className="hero-money grain relative isolate overflow-hidden rounded-3xl p-6 text-white sm:p-7 lg:col-span-7">
          <span aria-hidden className="hero-light" />
          <div className="relative flex h-full min-h-44 flex-col">
            <p className="text-sm font-medium text-white/75">{t.home.total}</p>
            <LastTotal />
            <div className="mt-8 flex gap-2 lg:mt-auto lg:pt-10" aria-hidden>
              <span className="chip-glass h-11 w-36 rounded-full" />
              <span className="chip-glass h-11 w-32 rounded-full" />
            </div>
          </div>
        </section>
        <Card className="space-y-4 p-6 sm:p-7 lg:col-span-5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-11 w-48 rounded-2xl" />
          <Skeleton className="h-3.5 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="h-12 rounded-2xl" />
          </div>
          <Skeleton className="h-11 w-full rounded-2xl" />
        </Card>
      </div>
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-44 w-[78%] shrink-0 rounded-3xl sm:w-72" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <Card className="space-y-4 p-6 lg:col-span-7">
          <Skeleton className="h-5 w-40" />
          <div className="flex h-48 items-end gap-3 pt-4">
            {[55, 70, 62, 80, 68, 90].map((h, i) => (
              <Skeleton key={i} className="flex-1 rounded-t-lg rounded-b-none" style={{ height: `${h}%` }} />
            ))}
          </div>
        </Card>
        <Card className="space-y-5 p-6 lg:col-span-5">
          <Skeleton className="h-5 w-32" />
          {[100, 70, 52, 34].map((w, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-1.5 rounded-full" style={{ width: `${w}%` }} />
            </div>
          ))}
        </Card>
      </div>
    </Busy>
  );
}
