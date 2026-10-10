import type { Metadata } from "next";
import { Suspense } from "react";

import { Busy } from "@/components/busy";
import { AccountsManager, type AccountStats } from "@/components/accounts-manager";
import { Skeleton } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { getAccounts, getSummary } from "@/lib/data";
import { currentMonthKey, monthRange } from "@/lib/dates";
import { totalsFromSummary } from "@/lib/insights";
import { getPreferences, requestTime } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.accounts };
}

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

  // Not awaited: each card's monthly totals stream in on their own, so one
  // slow summary doesn't hold the whole screen
  const stats: Record<string, Promise<AccountStats | null>> = Object.fromEntries(
    accounts
      .filter((a) => a.isActive)
      .map((account) => [
        account.id,
        // In the account's own currency, not converted
        getSummary(range.from, range.to, account.id, account.currency)
          .then((summary) => {
            const totals = totalsFromSummary(summary);
            return { income: totals.income, expense: totals.expense, count: totals.count };
          })
          .catch(() => null),
      ]),
  );

  return <AccountsManager accounts={accounts} stats={stats} openNew={params.new === "1"} />;
}

function AccountsSkeleton() {
  return (
    <Busy className="space-y-5 pt-2">
      <div className="flex justify-between">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-11 w-36 rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-60 rounded-3xl" />
        ))}
      </div>
    </Busy>
  );
}
