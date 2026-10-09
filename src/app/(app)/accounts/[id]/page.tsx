import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AccountDetail } from "@/components/account-detail";
import { Busy } from "@/components/busy";
import { Skeleton } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { ApiError } from "@/lib/api";
import {
  getAccount,
  getAuditLog,
  getConnections,
  getCurrentUser,
  getManagedProfiles,
  getMembers,
  getTransactionPage,
} from "@/lib/data";
import { canManage } from "@/lib/permissions";
import { requestTime } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/accounts/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { t } = await getI18n();
  const account = await getAccount(id).catch(() => null);
  return { title: account?.name ?? t.nav.accounts };
}

export default function AccountPage({ params }: PageProps<"/accounts/[id]">) {
  return (
    <div className="space-y-5">
      <Suspense fallback={<AccountSkeleton />}>
        <Account params={params} />
      </Suspense>
    </div>
  );
}

async function Account({ params }: { params: PageProps<"/accounts/[id]">["params"] }) {
  const { id } = await params;
  // 404 from the API = not a member (or doesn't exist): same page either way
  const account = await getAccount(id).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const user = await getCurrentUser();
  const manages = canManage(account.myRole);
  // Inviting needs your connections and family profiles; managed profiles
  // can't invite at all
  const canInvite = manages && !user.isManaged;

  const [members, movements, audit, connections, profiles] = await Promise.all([
    getMembers(id),
    // The latest entries; "See all" opens Activity filtered to this account
    getTransactionPage({ accountId: id, limit: 15 }),
    manages ? getAuditLog(id) : null,
    canInvite ? getConnections() : [],
    canInvite ? getManagedProfiles() : [],
  ]);

  const now = (await requestTime()).toISOString();
  return (
    <AccountDetail
      account={account}
      members={members}
      movements={movements}
      audit={audit}
      connections={connections}
      profiles={profiles}
      now={now}
    />
  );
}

function AccountSkeleton() {
  return (
    <Busy className="space-y-5 pt-2">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-5 lg:grid-cols-12">
        <Skeleton className="h-48 rounded-3xl lg:col-span-5" />
        <div className="flex flex-col gap-5 lg:col-span-7">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </div>
    </Busy>
  );
}
