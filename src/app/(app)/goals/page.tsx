import type { Metadata } from "next";
import { Suspense } from "react";

import { Busy } from "@/components/busy";
import { GoalsManager } from "@/components/goals";
import { Skeleton } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { getGoals } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.goals };
}

export default function GoalsPage({ searchParams }: PageProps<"/goals">) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <Suspense fallback={<GoalsSkeleton />}>
        <Goals searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

async function Goals({ searchParams }: { searchParams: PageProps<"/goals">["searchParams"] }) {
  const params = await searchParams;
  const goals = await getGoals();
  // ?new=1 opens the new-goal sheet; ?goal=<id> opens that goal (from Home)
  return <GoalsManager goals={goals} openNew={single(params.new) === "1"} openGoalId={single(params.goal)} />;
}

function GoalsSkeleton() {
  return (
    <Busy topic="goals" className="space-y-6 pt-2">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="hidden h-11 w-36 rounded-full sm:block" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-52 rounded-3xl" />
        ))}
      </div>
    </Busy>
  );
}
