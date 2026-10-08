import { LockSimple, SquaresFour } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountCard } from "@/components/account-card";
import { CashFlowChart } from "@/components/charts";
import { PreferencesProvider } from "@/components/preferences";
import { cn } from "@/components/ui";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  cancelled: "Sign-in was cancelled. Try again when you're ready.",
  state: "That sign-in link expired. Please start again.",
  google: "Google couldn't confirm your sign-in. Please try again.",
  api: "Your Google account was verified, but the finance service refused the sign-in. Check its GOOGLE_CLIENT_ID.",
  unreachable: "Can't reach the finance service right now. Make sure it's running, then try again.",
  expired: "Your session ended. Sign in again to pick up where you left off.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="flex flex-col px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 sm:px-12 lg:px-16">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[12px] bg-ink text-surface">
            <SquaresFour size={18} weight="fill" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight">Tally</span>
        </div>

        <div className="my-auto max-w-md py-16">
          <h1 className="rise text-[40px] leading-[1.05] font-semibold tracking-tighter sm:text-5xl">
            Know where every cent goes.
          </h1>
          <p className="rise mt-5 text-[17px] leading-relaxed text-ink-2" style={{ "--i": 1 } as React.CSSProperties}>
            Cash, debit and credit in one calm place. Log a purchase in two taps and see each month and year at a glance.
          </p>
          <div className="rise mt-10" style={{ "--i": 2 } as React.CSSProperties}>
            <Suspense fallback={<GoogleButton href="/auth/google" />}>
              <SignIn searchParams={searchParams} />
            </Suspense>
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-ink-2">
            <LockSimple size={16} />
            Your session stays in a secure, httpOnly cookie.
          </p>
        </div>
      </section>

      <Preview />
    </main>
  );
}

async function SignIn({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;
  const href = next ? `/auth/google?next=${encodeURIComponent(next)}` : "/auth/google";
  return (
    <>
      {error ? (
        <p role="alert" className="mb-4 rounded-2xl bg-expense-soft px-4 py-3 text-sm text-expense">
          {error}
        </p>
      ) : null}
      <GoogleButton href={href} />
    </>
  );
}

function GoogleButton({ href }: { href: string }) {
  return (
    // A plain link: this starts a full-page OAuth redirect, not a client navigation
    <a
      href={href}
      className={cn(
        "flex h-14 w-full items-center justify-center gap-3 rounded-full border border-line-strong bg-surface text-base font-medium text-ink shadow-soft",
        "transition-[transform,border-color,background-color] duration-200 hover:border-ink-3 hover:bg-surface-2 active:scale-[0.98]",
      )}
    >
      {/* Google "G" mark, official colours */}
      <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      Continue with Google
    </a>
  );
}

// The app's own components with example numbers, so the first screen shows
// what you'll actually get.
function Preview() {
  const points = [
    { key: "2026-05", income: 412000, expense: 298550 },
    { key: "2026-06", income: 412000, expense: 351210 },
    { key: "2026-07", income: 468000, expense: 302940 },
    { key: "2026-08", income: 412000, expense: 389120 },
    { key: "2026-09", income: 437500, expense: 276880 },
    { key: "2026-10", income: 412000, expense: 184330 },
  ] as const;
  return (
    <section
      aria-label="Example of the dashboard"
      className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#1e2a78_0%,#121a4d_60%,#0b1033_100%)] lg:flex lg:items-center lg:justify-center"
    >
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(129,151,255,0.35),transparent_45%)]" />
      <PreferencesProvider currency="USD" timeZone="UTC">
        <div className="relative w-full max-w-lg space-y-4 p-10" inert>
          <div className="grid grid-cols-2 gap-4">
            <AccountCard
              className="rotate-[-2deg]"
              account={{ id: "a", name: "Everyday Debit", type: "debit", isActive: true, balance: "2841.37" }}
            />
            <AccountCard
              className="translate-y-6 rotate-[2deg]"
              account={{ id: "b", name: "Visa Gold", type: "creditCard", isActive: true, balance: "-612.09" }}
            />
          </div>
          <div className="rounded-3xl border border-white/10 bg-surface/95 p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]">
            <p className="mb-4 text-[15px] font-semibold">Cash flow, last 6 months</p>
            <CashFlowChart points={[...points]} height={150} highlight="2026-10" />
          </div>
          <p className="text-center text-sm text-white/60">Example data</p>
        </div>
      </PreferencesProvider>
    </section>
  );
}
