import { Suspense } from "react";

import { PreferencesProvider } from "@/components/preferences";
import { QuickAddProvider } from "@/components/quick-add";
import { Dock, TopBar, TopBarSkeleton } from "@/components/shell";
import { ToastProvider } from "@/components/toast";
import { getAccounts, getCategories, getCurrentUser } from "@/lib/data";
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
  const { currency, timeZone } = await getPreferences();
  // Started here, awaited only where needed (user menu, the add sheet)
  const user = getCurrentUser();
  const accounts = getAccounts();
  const categories = getCategories();

  return (
    <PreferencesProvider currency={currency} timeZone={timeZone}>
      <ToastProvider>
        <QuickAddProvider accounts={accounts} categories={categories}>
          <a
            href="#main"
            className="sr-only z-60 rounded-full bg-ink px-4 py-2 text-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            Skip to content
          </a>
          <TopBar user={user} />
          <main id="main" className="mx-auto w-full max-w-6xl px-4 pt-2 pb-36 sm:px-6 sm:pb-32">
            {children}
          </main>
          <Dock />
        </QuickAddProvider>
      </ToastProvider>
    </PreferencesProvider>
  );
}

function ShellFallback() {
  return (
    <>
      <TopBarSkeleton />
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-6 sm:px-6">
        <div className="skeleton h-9 w-56" />
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <div className="skeleton h-56 rounded-3xl" />
          <div className="skeleton h-56 rounded-3xl" />
        </div>
        <div className="skeleton h-40 rounded-3xl" />
      </div>
    </>
  );
}
