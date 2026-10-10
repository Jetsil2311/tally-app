import type { Metadata } from "next";
import { Suspense } from "react";

import { Assistant } from "@/components/assistant";
import { Busy } from "@/components/busy";
import { Skeleton } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { getAccounts, getAiStatus, getFinancialProfile, getInsights } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.ai.title };
}

export default function AssistantPage() {
  return (
    <div className="space-y-5">
      <Suspense fallback={<AssistantSkeleton />}>
        <AssistantData />
      </Suspense>
    </div>
  );
}

async function AssistantData() {
  const [status, insights, profile, accounts] = await Promise.all([getAiStatus(), getInsights(), getFinancialProfile(), getAccounts()]);
  return <Assistant status={status} insights={insights} profile={profile} accounts={accounts} />;
}

function AssistantSkeleton() {
  return (
    <Busy className="space-y-5 pt-2">
      <Skeleton className="h-11 w-48" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Skeleton className="h-[28rem] rounded-3xl lg:col-span-7" />
        <div className="flex flex-col gap-5 lg:col-span-5">
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    </Busy>
  );
}
