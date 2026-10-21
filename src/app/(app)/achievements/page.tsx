import type { Metadata } from "next";
import { Suspense } from "react";

import { BadgeCase } from "@/components/badges";
import { Busy } from "@/components/busy";
import { Skeleton } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { getBadges } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.achievements };
}

export default function AchievementsPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <Suspense fallback={<AchievementsSkeleton />}>
        <Achievements />
      </Suspense>
    </div>
  );
}

async function Achievements() {
  return <BadgeCase badges={await getBadges()} />;
}

function AchievementsSkeleton() {
  return (
    <Busy topic="achievements" className="space-y-6 pt-2">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-36 rounded-3xl" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 rounded-3xl" />
        ))}
      </div>
    </Busy>
  );
}
