import type { Metadata } from "next";
import { Suspense } from "react";

import { Busy } from "@/components/busy";
import { CategoriesManager } from "@/components/categories-manager";
import { Skeleton } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { getAccounts, getCategories, getSummary } from "@/lib/data";
import { currentMonthKey, monthRange } from "@/lib/dates";
import { toCents } from "@/lib/money";
import { getPreferences, requestTime } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.categories };
}

export default function CategoriesPage() {
  return (
    <div className="space-y-5">
      <Suspense fallback={<CategoriesSkeleton />}>
        <Categories />
      </Suspense>
    </div>
  );
}

async function Categories() {
  const { timeZone } = await getPreferences();
  const range = monthRange(currentMonthKey(timeZone, await requestTime()), timeZone);
  const [categories, summary, accounts] = await Promise.all([getCategories(), getSummary(range.from, range.to), getAccounts(true)]);

  const spent: Record<string, number> = {};
  for (const row of summary.byCategory) {
    if (row.type === "expense" && row.categoryId) spent[row.categoryId] = toCents(row.total);
  }

  return <CategoriesManager categories={categories} spent={spent} accounts={accounts} />;
}

function CategoriesSkeleton() {
  return (
    <Busy className="space-y-5 pt-2">
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
      </div>
    </Busy>
  );
}
