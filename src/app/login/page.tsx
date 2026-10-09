import { KeyReturn, LockSimple, SquaresFour } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountCard } from "@/components/account-card";
import { CashFlowChart } from "@/components/charts";
import { PreferencesProvider } from "@/components/preferences";
import { cn, Skeleton } from "@/components/ui";
import { I18nProvider } from "@/i18n/client";
import type { Dictionary } from "@/i18n/dictionaries";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.login.title, description: t.login.description };
}

// Everything on this page is in the visitor's language, which comes from a
// cookie, so it streams in behind a skeleton of the same shape
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-[12px] bg-ink text-surface">
        <SquaresFour size={18} weight="fill" />
      </span>
      <span translate="no" className="text-[17px] font-semibold tracking-tight">
        Tally
      </span>
    </div>
  );
}

function LoginSkeleton() {
  return (
    <main className="grid grid-cols-1 min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" aria-busy>
      <section className="flex flex-col px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 sm:px-12 lg:px-16">
        <Brand />
        <div className="my-auto w-full max-w-md space-y-5 py-16">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-14 w-4/5" />
          <Skeleton className="mt-10 h-14 w-full rounded-full" />
        </div>
      </section>
      <section className="hidden bg-[linear-gradient(160deg,#1e2a78_0%,#121a4d_60%,#0b1033_100%)] lg:block" />
    </main>
  );
}

async function Login({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { t, locale } = await getI18n();
  return (
    <I18nProvider locale={locale}>
    <main className="grid grid-cols-1 min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="flex flex-col px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 sm:px-12 lg:px-16">
        <Brand />

        <div className="my-auto max-w-md py-16">
          <h1 className="rise text-[40px] leading-[1.05] font-semibold tracking-tighter sm:text-5xl">
            {t.login.headline}
          </h1>
          <p className="rise mt-5 text-[17px] leading-relaxed text-ink-2" style={{ "--i": 1 } as React.CSSProperties}>
            {t.login.body}
          </p>
          <div className="rise mt-10" style={{ "--i": 2 } as React.CSSProperties}>
            <SignIn searchParams={searchParams} t={t} />
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-ink-2">
            <LockSimple size={16} />
            {t.login.secureCookie}
          </p>
        </div>
      </section>

      <Preview t={t} />
    </main>
    </I18nProvider>
  );
}

async function SignIn({ searchParams, t }: { searchParams: PageProps<"/login">["searchParams"]; t: Dictionary }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? t.login.errors[params.error] : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;
  const href = next ? `/auth/google?next=${encodeURIComponent(next)}` : "/auth/google";
  const codeError = params.error === "profileCode";
  return (
    <>
      {error ? (
        <p role="alert" className="mb-4 rounded-2xl bg-expense-soft px-4 py-3 text-sm text-expense">
          {error}
        </p>
      ) : null}
      <GoogleButton href={href} label={t.login.continueWithGoogle} />

      {/* A family profile's first sign-in: the code from their guardian. A
          plain POST form: works before any JavaScript loads and keeps the code out of the URL. */}
      <details className="group mt-5" open={codeError}>
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full text-sm font-medium text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
          <KeyReturn size={18} /> {t.login.haveCode}
        </summary>
        <form action="/auth/google" method="post" className="mt-3 space-y-3 rounded-3xl border border-line bg-surface p-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <label htmlFor="profile-code" className="block text-sm font-medium">
            {t.login.codeLabel}
          </label>
          <input
            id="profile-code"
            name="code"
            required
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            pattern="[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}"
            title={t.login.codeInvalid}
            placeholder={t.login.codePlaceholder}
            aria-describedby="profile-code-hint"
            className="h-12 w-full rounded-2xl border border-line bg-surface-2 px-4 font-mono text-lg tracking-[0.12em] uppercase placeholder:text-ink-3 focus:border-accent focus:ring-4 focus:ring-accent-soft focus:outline-none"
          />
          <p id="profile-code-hint" className="text-sm text-ink-2">
            {t.login.codeHint}
          </p>
          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-full bg-ink text-[15px] font-medium text-surface transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
          >
            {t.login.continueWithGoogle}
          </button>
        </form>
      </details>
    </>
  );
}

function GoogleButton({ href, label }: { href: string; label: string }) {
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
      {label}
    </a>
  );
}

// The app's own components with example numbers, so the first screen shows
// what you'll actually get.
function Preview({ t }: { t: Dictionary }) {
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
      aria-label={t.login.example}
      className="relative hidden overflow-hidden bg-[linear-gradient(160deg,#1e2a78_0%,#121a4d_60%,#0b1033_100%)] lg:flex lg:items-center lg:justify-center"
    >
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(129,151,255,0.35),transparent_45%)]" />
      <PreferencesProvider currency="USD" timeZone="UTC">
        <div className="relative w-full max-w-lg space-y-4 p-10" inert>
          <div className="grid grid-cols-2 gap-4">
            <AccountCard
              className="rotate-[-2deg]"
              account={{ id: "a", name: t.login.exampleAccounts.debit, type: "debit", isActive: true, balance: "2841.37", currency: "USD", preferredBalance: null, myRole: "owner", memberCount: 1 }}
            />
            <AccountCard
              className="translate-y-6 rotate-[2deg]"
              account={{ id: "b", name: t.login.exampleAccounts.credit, type: "creditCard", isActive: true, balance: "-612.09", currency: "USD", preferredBalance: null, myRole: "owner", memberCount: 2 }}
            />
          </div>
          <div className="rounded-3xl border border-white/10 bg-surface/95 p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]">
            <p className="mb-4 text-[15px] font-semibold">{t.home.cashFlow}</p>
            <CashFlowChart points={[...points]} height={150} highlight="2026-10" />
          </div>
          <p className="text-center text-sm text-white/60">{t.login.exampleData}</p>
        </div>
      </PreferencesProvider>
    </section>
  );
}
