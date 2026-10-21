import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AccountDetail } from "@/components/account-detail";
import { CardCycleCard, ChoresCard, SettleUpCard } from "@/components/account-extras";
import { Busy } from "@/components/busy";
import { Skeleton } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { ApiError } from "@/lib/api";
import {
  getAccount,
  getAuditLog,
  getCardCycle,
  getChores,
  getConnections,
  getCurrentUser,
  getManagedProfiles,
  getMembers,
  getSettlement,
  getTransactionPage,
} from "@/lib/data";
import { capitalize } from "@/i18n/format";
import { currentMonthKey, monthLabel, monthRange } from "@/lib/dates";
import type { Account, Member } from "@/lib/types";
import { canManage } from "@/lib/permissions";
import { getPreferences, requestTime } from "@/lib/session";

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

  const requested = await requestTime();
  const now = requested.toISOString();
  const { timeZone } = await getPreferences();
  const { locale } = await getI18n();
  const range = monthRange(currentMonthKey(timeZone, requested), timeZone);
  const shared = members.filter((m) => m.status === "active").length > 1;
  const hasCycle = account.type === "creditCard" && account.statementDay != null && account.paymentDueDays != null;
  return (
    <AccountDetail
      side={
        <>
          {hasCycle ? (
            <Suspense fallback={<Skeleton className="h-44 rounded-3xl" />}>
              <Cycle account={account} />
            </Suspense>
          ) : null}
          {shared ? (
            <Suspense fallback={<Skeleton className="h-40 rounded-3xl" />}>
              <Settle
                accountId={account.id}
                members={members}
                from={range.from}
                to={range.to}
                month={capitalize(monthLabel(currentMonthKey(timeZone, requested), "long", false, locale))}
              />
            </Suspense>
          ) : null}
        </>
      }
      main={
        shared ? (
          <Suspense fallback={<Skeleton className="h-40 rounded-3xl" />}>
            <Chores account={account} members={members} />
          </Suspense>
        ) : null
      }
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

async function Cycle({ account }: { account: Account }) {
  const cycle = await getCardCycle(account.id);
  return cycle ? <CardCycleCard cycle={cycle} account={account} /> : null;
}

async function Settle({ accountId, members, from, to, month }: { accountId: string; members: Member[]; from: string; to: string; month: string }) {
  const settlement = await getSettlement(accountId, from, to);
  // Nothing shared yet this month: nothing to settle
  return settlement && Number(settlement.totalShared) > 0 ? <SettleUpCard settlement={settlement} members={members} month={month} /> : null;
}

async function Chores({ account, members }: { account: Account; members: Member[] }) {
  return <ChoresCard account={account} chores={await getChores(account.id)} members={members} />;
}

function AccountSkeleton() {
  return (
    <Busy topic="account" className="space-y-5 pt-2">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Skeleton className="h-48 rounded-3xl lg:col-span-5" />
        <div className="flex flex-col gap-5 lg:col-span-7">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </div>
    </Busy>
  );
}
