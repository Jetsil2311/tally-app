import type { Metadata } from "next";
import { Suspense } from "react";

import { Busy } from "@/components/busy";
import { BudgetsManager } from "@/components/budgets";
import { Skeleton } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { getAccounts, getBudgets, getCategories } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.budgets };
}

export default function BudgetsPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <Suspense fallback={<BudgetsSkeleton />}>
        <Budgets />
      </Suspense>
    </div>
  );
}

async function Budgets() {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);
  // Yours, then each account's (every member can see an account's budgets)
  const [personal, ...perAccount] = await Promise.all([getBudgets(), ...accounts.map((a) => getBudgets(a.id))]);
  const groups = [
    { account: null, budgets: personal },
    ...accounts.map((account, i) => ({ account, budgets: perAccount[i] ?? [] })),
  ];
  return <BudgetsManager groups={groups} accounts={accounts} categories={categories} />;
}

function BudgetsSkeleton() {
  return (
    <Busy topic="budgets" className="space-y-6 pt-2">
      <div className="flex justify-between">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-11 w-36 rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-44 rounded-3xl" />
        ))}
      </div>
    </Busy>
  );
}
