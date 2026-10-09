import { SignOut } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import { Suspense } from "react";

import { Busy } from "@/components/busy";
import { signOut } from "@/actions/settings";
import { ApiKeysPanel, AppearancePanel, DangerZone } from "@/components/settings-panels";
import { buttonClass, Card, Skeleton } from "@/components/ui";
import { LOCALE_CHOICE_COOKIE, isLanguage } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { getApiKeys, getCurrentUser } from "@/lib/data";
import { getPreferences } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.nav.settings };
}

export default async function SettingsPage() {
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="rise pt-2 text-[28px] font-semibold tracking-tight sm:text-[32px]">{t.nav.settings}</h1>
      <Suspense fallback={<SettingsSkeleton />}>
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  const { timeZone } = await getPreferences();
  const { t, locale } = await getI18n();
  const choice = (await cookies()).get(LOCALE_CHOICE_COOKIE)?.value;
  const user = await getCurrentUser();
  // Family profiles can't manage API keys (their guardian does)
  const keys = user.isManaged ? null : await getApiKeys();
  const since = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone }).format(new Date(user.createdAt));

  return (
    <>
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        {user.imageUrl ? (
          <Image src={user.imageUrl} alt="" width={56} height={56} className="rounded-full" referrerPolicy="no-referrer" />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{user.name ?? t.settings.yourProfile}</p>
          <p className="truncate text-ink-2">{user.email}</p>
          <p className="mt-0.5 text-sm text-ink-3">{t.settings.signedInSince(since)}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className={buttonClass("secondary")}>
            <SignOut size={18} /> {t.nav.signOut}
          </button>
        </form>
      </Card>
      <AppearancePanel language={isLanguage(choice) ? choice : "auto"} />
      {keys ? <ApiKeysPanel keys={keys} timeZone={timeZone} /> : null}
      <DangerZone />
    </>
  );
}

function SettingsSkeleton() {
  return (
    <Busy className="space-y-5">
      <Skeleton className="h-28 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-56 rounded-3xl" />
    </Busy>
  );
}
