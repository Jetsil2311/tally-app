import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountsManager, type AccountStats } from "@/components/accounts-manager";
import { Skeleton } from "@/components/ui";
import { getAccounts, getSummary } from "@/lib/data";
import { currentMonthKey, monthRange } from "@/lib/dates";
import { totalsFromSummary } from "@/lib/insights";
import { getPreferences, requestTime } from "@/lib/session";

export const metadata: Metadata = { title: "Accounts" };

export default function AccountsPage({ searchParams }: PageProps<"/accounts">) {
  return (
    <div className="space-y-5">
      <Suspense fallback={<AccountsSkeleton />}>
        <Accounts searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Accounts({ searchParams }: { searchParams: PageProps<"/accounts">["searchParams"] }) {
  const params = await searchParams;
  const { timeZone } = await getPreferences();
  const range = monthRange(currentMonthKey(timeZone, await requestTime()), timeZone);
  const accounts = await getAccounts(true);

  const stats: Record<string, AccountStats> = {};
  await Promise.all(
    accounts
      .filter((a) => a.isActive)
      .map(async (account) => {
        const totals = totalsFromSummary(await getSummary(range.from, range.to, account.id));
        stats[account.id] = { income: totals.income, expense: totals.expense, count: totals.count };
      }),
  );

  return <AccountsManager accounts={accounts} stats={stats} openNew={params.new === "1"} />;
}

function AccountsSkeleton() {
  return (
    <div className="space-y-5 pt-2" aria-busy aria-label="Loading">
      <div className="flex justify-between">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-11 w-36 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-60 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
