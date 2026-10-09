import type { Metadata } from "next";
import { Suspense } from "react";

import { Busy } from "@/components/busy";
import { ManagedNotice, PeopleManager } from "@/components/people-manager";
import { Skeleton } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { getConnections, getCurrentUser, getInvitations, getManagedProfiles } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.people };
}

export default function PeoplePage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <Suspense fallback={<PeopleSkeleton />}>
        <People />
      </Suspense>
    </div>
  );
}

async function People() {
  const user = await getCurrentUser();
  // Managed profiles (e.g. children) can't use connections or invitations
  if (user.isManaged) {
    const { t } = await getI18n();
    return <ManagedNotice guardian={user.managedBy?.name || user.managedBy?.email || t.people.someone} />;
  }
  const [connections, invitations, profiles] = await Promise.all([getConnections(), getInvitations(), getManagedProfiles()]);
  return <PeopleManager connections={connections} invitations={invitations} profiles={profiles} />;
}

function PeopleSkeleton() {
  return (
    <Busy className="space-y-5 pt-2">
      <div className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Skeleton className="h-72 rounded-3xl lg:col-span-7" />
        <div className="flex flex-col gap-5 lg:col-span-5">
          <Skeleton className="h-52 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      </div>
    </Busy>
  );
}
