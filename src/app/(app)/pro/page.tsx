import type { Metadata } from "next";
import { Suspense } from "react";

import { Busy } from "@/components/busy";
import { ProPage } from "@/components/pro-page";
import { Skeleton } from "@/components/ui";
import { getAiStatus, getBilling } from "@/lib/data";

export const metadata: Metadata = { title: "Tally Pro" };

export default function Pro({ searchParams }: PageProps<"/pro">) {
  return (
    <div className="space-y-8 pb-6">
      <Suspense fallback={<ProSkeleton />}>
        <ProContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ProContent({ searchParams }: { searchParams: PageProps<"/pro">["searchParams"] }) {
  const params = await searchParams;
  const [billing, ai] = await Promise.all([getBilling(), getAiStatus()]);
  // The free plan's AI limit is only known for a free user (it's their own)
  const freeAiLimit = billing?.plan === "pro" ? null : (ai?.limit ?? null);
  return <ProPage billing={billing} freeAiLimit={freeAiLimit} returning={params.checkout === "success"} />;
}

function ProSkeleton() {
  return (
    <Busy topic="pro" className="flex flex-col items-center gap-6 pt-4">
      <Skeleton className="size-20 rounded-[1.75rem]" />
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-80 w-full max-w-2xl rounded-3xl" />
    </Busy>
  );
}
