import { SignOut } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";

import { signOut } from "@/actions/settings";
import { ApiKeysPanel, AppearancePanel, DangerZone } from "@/components/settings-panels";
import { buttonClass, Card, Skeleton } from "@/components/ui";
import { getApiKeys, getCurrentUser } from "@/lib/data";
import { getPreferences } from "@/lib/session";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="rise pt-2 text-[28px] font-semibold tracking-tight sm:text-[32px]">Settings</h1>
      <Suspense fallback={<SettingsSkeleton />}>
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  const { timeZone } = await getPreferences();
  const [user, keys] = await Promise.all([getCurrentUser(), getApiKeys()]);
  const since = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone }).format(new Date(user.createdAt));

  return (
    <>
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        {user.imageUrl ? (
          <Image src={user.imageUrl} alt="" width={56} height={56} className="rounded-full" referrerPolicy="no-referrer" />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{user.name ?? "Your profile"}</p>
          <p className="truncate text-ink-2">{user.email}</p>
          <p className="mt-0.5 text-sm text-ink-3">Signed in with Google · tracking since {since}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className={buttonClass("secondary")}>
            <SignOut size={18} /> Sign out
          </button>
        </form>
      </Card>
      <AppearancePanel />
      <ApiKeysPanel keys={keys} timeZone={timeZone} />
      <DangerZone />
    </>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-5" aria-busy aria-label="Loading">
      <Skeleton className="h-28 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-56 rounded-3xl" />
    </div>
  );
}
