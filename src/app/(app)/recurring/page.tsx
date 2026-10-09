import type { Metadata } from "next";
import { Suspense } from "react";

import { Busy } from "@/components/busy";
import { RecurringManager } from "@/components/recurring-manager";
import { Skeleton } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { getAccounts, getCategories, getCurrentUser, getRatesTo, getRecurringPayments, getUpcoming } from "@/lib/data";
import { dayKey } from "@/lib/dates";
import { getPreferences, requestTime } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.recurring };
}

export default function RecurringPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <Suspense fallback={<RecurringSkeleton />}>
        <Recurring />
      </Suspense>
    </div>
  );
}

async function Recurring() {
  const { timeZone } = await getPreferences();
  const now = await requestTime();
  const [payments, upcoming, accounts, categories, user] = await Promise.all([
    getRecurringPayments(true),
    getUpcoming(30),
    getAccounts(true),
    getCategories(),
    getCurrentUser(),
  ]);
  // Payments can be charged in any currency: totals across them are
  // converted to the preferred one at today's rate
  const rates = await getRatesTo(
    [...payments.map((p) => p.currency), ...upcoming.occurrences.flatMap((o) => [o.currency, o.accountCurrency])],
    user.preferredCurrency,
  );

  return (
    <RecurringManager
      payments={payments}
      upcoming={upcoming}
      accounts={accounts}
      categories={categories}
      rates={rates}
      today={dayKey(now, timeZone)}
    />
  );
}

function RecurringSkeleton() {
  return (
    <Busy className="space-y-6 pt-2">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="hidden h-11 w-40 rounded-full sm:block" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <Skeleton className="h-96 rounded-3xl lg:col-span-7" />
        <div className="flex flex-col gap-4 lg:col-span-5 lg:gap-5">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      </div>
      <Skeleton className="h-64 rounded-3xl" />
    </Busy>
  );
}
