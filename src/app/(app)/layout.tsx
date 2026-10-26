import { Suspense } from "react";

import { AiProvider } from "@/components/ai-assist";
import { AssistantSheet } from "@/components/assistant";
import { BadgeCelebrator } from "@/components/badges";
import { LoadingStatus } from "@/components/loading-status";
import { PageTransition } from "@/components/page-transition";
import { PlanProvider } from "@/components/plan";
import { PreferencesProvider } from "@/components/preferences";
import { QuickAddProvider } from "@/components/quick-add";
import { Dock, Sidebar, TopBar, TopBarSkeleton } from "@/components/shell";
import { ToastProvider } from "@/components/toast";
import { ViewerProvider } from "@/components/people-ui";
import { getAccounts, getAttention, getBadges, getBilling, getCategories, getCurrencies, getCurrentUser, getCurrentWorkspace, getInsights, getWorkspaces } from "@/lib/data";
import { I18nProvider } from "@/i18n/client";
import { getI18n } from "@/i18n/server";
import { env } from "@/lib/env";
import { getPreferences } from "@/lib/session";

// Signed-in shell. Everything here depends on the session cookie, so it
// streams in behind a Suspense boundary while the skeleton paints instantly.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const { timeZone } = await getPreferences();
  const { locale, t } = await getI18n();
  // Who's signed in: needed by every screen for "You" and permissions.
  // The rest is started here but not awaited, so the top bar and dock paint
  // without waiting on /accounts (the slowest call): each account's currency
  // (amounts are formatted in it) and the currencies the API can convert
  const me = await getCurrentUser();
  const accountCurrencies = getAccounts(true)
    .then((all) => Object.fromEntries(all.map((a) => [a.id, a.currency])))
    .catch(() => ({}));
  const currencies = getCurrencies().catch(() => null);
  // Started here, awaited only where needed (user menu, the add sheet)
  const user = Promise.resolve(me);
  const accounts = getAccounts();
  const categories = getCategories();
  const attention = getAttention().then(({ invitations, requests }) => invitations.length + requests.length);
  // New insights from the assistant, for the dot on its button
  // Badges after every change (each action refreshes the shell): new ones
  // pop up as a celebration
  const badges = getBadges();
  // The plan (free / Pro), for the Pro chips; never awaited here
  const billing = getBilling();
  const aiUnseen = getInsights().then((list) => list.filter((insight) => !insight.seenAt).length);
  // Personal or one of your businesses: the switcher, and the Business section
  const workspace = { workspaces: getWorkspaces(), current: getCurrentWorkspace() };

  return (
    <I18nProvider locale={locale}>
    <ViewerProvider viewer={{ id: me.id, name: me.name, isManaged: me.isManaged }}>
    <PreferencesProvider
      currency={me.preferredCurrency}
      timeZone={timeZone}
      accountCurrencies={accountCurrencies}
      currencies={currencies}
    >
      <ToastProvider>
        <PlanProvider billing={billing} stripeKey={env.stripePublishableKey}>
        <AiProvider>
        <QuickAddProvider accounts={accounts} categories={categories}>
          <a
            href="#main"
            className="sr-only z-60 rounded-full bg-ink px-4 py-2 text-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            {t.nav.skipToContent}
          </a>
          <Sidebar attention={attention} workspace={workspace} />
          {/* Desktop: the sidebar takes the left 15rem */}
          <div className="lg:pl-60">
          <TopBar user={user} aiUnseen={aiUnseen} workspace={workspace} />
          <main id="main" className="mx-auto w-full max-w-6xl px-4 pt-2 pb-36 sm:px-6 sm:pb-32 lg:pb-12">
            <PageTransition>{children}</PageTransition>
          </main>
          </div>
          <Dock attention={attention} workspace={workspace} />
          <AssistantSheet accounts={accounts} />
          <Suspense fallback={null}>
            <BadgeCelebrator badges={badges} />
          </Suspense>
        </QuickAddProvider>
        </AiProvider>
        </PlanProvider>
      </ToastProvider>
    </PreferencesProvider>
    </ViewerProvider>
    </I18nProvider>
  );
}

function ShellFallback() {
  return (
    <>
      {/* The sidebar's place on desktop, so nothing jumps when it arrives */}
      <div aria-hidden className="fixed inset-y-0 left-0 hidden w-60 border-r border-line/70 lg:block" />
      <div className="lg:pl-60" aria-busy>
      <TopBarSkeleton />
      {/* Before anything is known about the user: Buck says Tally is
          getting ready, over the outline of Home */}
      <LoadingStatus topic="shell" />
      <div className="busy mx-auto w-full max-w-6xl space-y-6 px-4 pt-6 sm:px-6">
        <div className="skeleton h-10 w-64 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]">
          <div className="hero-money grain relative isolate h-56 overflow-hidden rounded-3xl">
            <span aria-hidden className="hero-light" />
          </div>
          <div className="skeleton h-56 rounded-3xl" />
        </div>
        <div className="skeleton h-40 rounded-3xl" />
      </div>
      </div>
    </>
  );
}
