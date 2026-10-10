"use client";

import {
  AppleLogo,
  ArrowRight,
  ArrowsClockwise,
  CaretDown,
  ChartLineUp,
  CurrencyCircleDollar,
  GooglePlayLogo,
  Keyboard,
  LockKey,
  ShieldCheck,
  SignOut,
  SquaresFour,
  Tag,
  TrendUp,
  UserCircle,
  UsersThree,
  Wallet,
} from "@phosphor-icons/react";
import Link from "next/link";

import { useI18n } from "@/i18n/client";
import type { Account, ChatAnswer, MemberRole } from "@/lib/types";

import { AccountCard } from "./account-card";
import { AiMark } from "./ai-mark";
import { AnswerCard } from "./assistant";
import { CashFlowChart } from "./charts";
import { AvatarStack, RoleBadge, RoleIcon, TxStatusPill } from "./people-ui";
import { Money, useMoney } from "./preferences";
import { buttonClass, cn } from "./ui";

// The public landing page. Every product visual is a real Tally component
// rendered with example data (and labelled as such), never a drawn mock-up.

// Store listings: placeholders until the apps are published. Replace the
// "#" with the real App Store / Google Play URLs.
export const STORE_LINKS = { ios: "#", android: "#" } as const;

type Example = { currency: string };

function exampleAccount(id: string, name: string, type: Account["type"], balance: string, currency: string): Account {
  return {
    id,
    name,
    type,
    isActive: true,
    currency,
    balance,
    unverified: { income: "0", expense: "0", count: 0 },
    projectedBalance: balance,
    preferredBalance: null,
    myRole: "owner",
    memberCount: 1,
  };
}

export function Landing({ currency, year }: Example & { year: number }) {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh bg-bg">
      <a
        href="#main"
        className="sr-only z-60 rounded-full bg-ink px-4 py-2 text-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t.nav.skipToContent}
      </a>
      <Nav />
      <main id="main">
        <Hero currency={currency} />
        <Features currency={currency} />
        <AiSection />
        <Sharing currency={currency} />
        <Privacy />
        <Download />
        <Faq />
      </main>
      <Footer year={year} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function Brand() {
  const { t } = useI18n();
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-full pr-2" aria-label={t.nav.tallyHome}>
      <span className="flex size-9 items-center justify-center rounded-[12px] bg-ink text-surface">
        <SquaresFour size={18} weight="fill" />
      </span>
      <span translate="no" className="text-[17px] font-semibold tracking-tight">
        Tally
      </span>
    </Link>
  );
}

function Nav() {
  const { t } = useI18n();
  const links = [
    { href: "#features", label: t.landing.nav.features },
    { href: "#assistant", label: t.landing.nav.assistant },
    { href: "#sharing", label: t.landing.nav.sharing },
    { href: "#faq", label: t.landing.nav.faq },
  ];
  return (
    <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
        <Brand />
        <nav aria-label={t.landing.nav.menu} className="ml-6 hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className={cn(buttonClass("ghost", "sm"), "hidden sm:inline-flex")}>
            {t.landing.signIn}
          </Link>
          <Link href="/login" className={buttonClass("primary", "sm")}>
            {t.landing.getStarted}
          </Link>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Store buttons (placeholders until the apps are listed)
// ---------------------------------------------------------------------------

export function StoreButtons({ className }: { className?: string }) {
  const { t } = useI18n();
  const badge =
    "inline-flex h-14 min-w-0 flex-1 items-center gap-3 rounded-full bg-ink pr-5 pl-4 text-surface transition-[transform,opacity] duration-200 hover:opacity-90 active:scale-[0.98] sm:min-w-44 sm:flex-none sm:pr-6";
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <a href={STORE_LINKS.ios} className={badge} aria-label={`${t.landing.appStore.small} ${t.landing.appStore.big}`}>
        <AppleLogo size={28} weight="fill" aria-hidden />
        <span className="flex flex-col leading-tight">
          <span className="text-[11px] opacity-80">{t.landing.appStore.small}</span>
          <span className="text-[17px] font-semibold tracking-tight">{t.landing.appStore.big}</span>
        </span>
      </a>
      <a href={STORE_LINKS.android} className={badge} aria-label={`${t.landing.googlePlay.small} ${t.landing.googlePlay.big}`}>
        <GooglePlayLogo size={26} weight="fill" aria-hidden />
        <span className="flex flex-col leading-tight">
          <span className="text-[11px] opacity-80">{t.landing.googlePlay.small}</span>
          <span className="text-[17px] font-semibold tracking-tight">{t.landing.googlePlay.big}</span>
        </span>
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero: asymmetric split, real components on the right
// ---------------------------------------------------------------------------

const POINTS = [
  { key: "2026-05", income: 412000, expense: 298550 },
  { key: "2026-06", income: 412000, expense: 351210 },
  { key: "2026-07", income: 468000, expense: 302940 },
  { key: "2026-08", income: 412000, expense: 389120 },
  { key: "2026-09", income: 437500, expense: 276880 },
  { key: "2026-10", income: 412000, expense: 184330 },
] as const;

function Hero({ currency }: Example) {
  const { t } = useI18n();
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:pt-16 lg:pb-24">
      <div className="min-w-0">
        <h1 className="rise text-[clamp(2.5rem,7vw,4rem)] leading-[1.02] font-semibold tracking-tighter">{t.landing.heroTitle}</h1>
        <p className="rise mt-5 max-w-[46ch] text-lg leading-relaxed text-ink-2" style={{ "--i": 1 } as React.CSSProperties}>
          {t.landing.heroBody}
        </p>
        <div className="rise mt-8 flex flex-col gap-4" style={{ "--i": 2 } as React.CSSProperties}>
          <Link href="/login" className={cn(buttonClass("primary", "lg"), "w-full sm:w-fit")}>
            {t.landing.getStarted} <ArrowRight size={18} weight="bold" />
          </Link>
          <StoreButtons />
        </div>
      </div>

      {/* Real components, example data. Inert: it's a picture, not a UI */}
      <div className="rise relative min-w-0" style={{ "--i": 3 } as React.CSSProperties} aria-label={t.landing.previewLabel} role="img">
        <div inert className="relative">
          <span aria-hidden className="absolute -inset-6 -z-10 rounded-[40px] bg-[radial-gradient(60%_60%_at_70%_30%,var(--accent-soft),transparent)]" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <AccountCard
              className="-rotate-2"
              account={exampleAccount("a", t.login.exampleAccounts.debit, "debit", "2841.37", currency)}
            />
            <AccountCard
              className="translate-y-6 rotate-2"
              account={exampleAccount("b", t.login.exampleAccounts.credit, "creditCard", "-612.09", currency)}
            />
          </div>
          <div className="relative mt-10 rounded-3xl border border-line bg-surface p-5 shadow-float sm:p-6">
            <p className="mb-7 text-[15px] font-semibold">{t.home.cashFlow}</p>
            <CashFlowChart points={[...POINTS]} height={140} highlight="2026-10" />
          </div>
          <p className="absolute -bottom-5 left-4 inline-flex items-center gap-2 rounded-full ai-surface px-3.5 py-2 text-sm font-medium shadow-soft sm:left-8">
            <AiMark size={16} /> {t.ai.verdict.tight.label}
          </p>
        </div>
        <p className="mt-10 text-center text-xs text-ink-3">{t.landing.exampleData}</p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Features: asymmetric bento (5 items, 5 cells: 4+2 / 2+2+2)
// ---------------------------------------------------------------------------

function Features({ currency }: Example) {
  const { t } = useI18n();
  const f = t.landing.features;
  return (
    <section id="features" className="scroll-mt-20 border-t border-line/70 bg-surface-2/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="reveal max-w-[60ch]">
          <h2 className="text-[clamp(1.875rem,4vw,2.75rem)] leading-tight font-semibold tracking-tight">{t.landing.featuresTitle}</h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-2">{t.landing.featuresBody}</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-6">
          {/* Accounts: the wide cell, with real account cards */}
          <article className="reveal flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-6 md:col-span-4">
            <Wallet size={26} className="text-accent" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold tracking-tight">{f.accounts.title}</h3>
            <p className="mt-2 max-w-[48ch] text-ink-2">{f.accounts.body}</p>
            <div inert className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <AccountCard account={exampleAccount("c", t.accountTypes.cash.label, "cash", "640.00", currency)} />
              <AccountCard account={exampleAccount("d", t.login.exampleAccounts.debit, "debit", "2841.37", currency)} />
              <AccountCard account={exampleAccount("e", t.login.exampleAccounts.credit, "creditCard", "-612.09", "USD")} />
            </div>
          </article>

          {/* Capture: accent-tinted cell with the keyboard shortcut */}
          <article className="reveal flex flex-col rounded-3xl bg-accent p-6 text-accent-ink md:col-span-2">
            <Keyboard size={26} aria-hidden />
            <h3 className="mt-4 text-xl font-semibold tracking-tight">{f.capture.title}</h3>
            <p className="mt-2 opacity-85">{f.capture.body}</p>
            <p className="mt-auto flex items-center gap-3 pt-8 text-sm">
              <kbd className="flex size-12 items-center justify-center rounded-2xl bg-accent-ink/15 text-xl font-semibold">N</kbd>
              {t.landing.keyHint}
            </p>
          </article>

          {/* Recurring + verification, with real status pills */}
          <article className="reveal flex flex-col rounded-3xl border border-line bg-surface p-6 md:col-span-2">
            <ArrowsClockwise size={26} className="text-accent" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold tracking-tight">{f.recurring.title}</h3>
            <p className="mt-2 text-ink-2">{f.recurring.body}</p>
            <ul inert className="mt-6 space-y-2 text-[15px]">
              {[
                { name: t.landing.exampleRent, amount: -8500, status: "unverified" as const },
                { name: t.landing.exampleStreaming, amount: -219, status: "approved" as const },
                { name: t.landing.exampleSalary, amount: 41200, status: "unverified" as const },
              ].map((row) => (
                <li key={row.name} className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5">
                  <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
                  <TxStatusPill status={row.status} />
                  <Money value={row.amount} currency={currency} sign className={cn("font-semibold", row.amount > 0 && "text-income")} />
                </li>
              ))}
            </ul>
          </article>

          {/* Currencies: a conversion, as Tally shows it */}
          <article className="reveal flex flex-col rounded-3xl border border-line bg-surface p-6 md:col-span-2">
            <CurrencyCircleDollar size={26} className="text-accent" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold tracking-tight">{f.currency.title}</h3>
            <p className="mt-2 text-ink-2">{f.currency.body}</p>
            <div inert className="mt-auto pt-6">
              <div className="rounded-3xl bg-expense-soft px-4 py-5 text-center">
                <Money value={-10} currency="USD" sign className="text-3xl font-semibold tracking-tight" />
                <p className="mt-1 text-sm text-ink-2">
                  ≈ <Money value={182.4} currency="MXN" className="font-medium text-ink" /> · 1 USD = 18.24 MXN
                </p>
              </div>
            </div>
          </article>

          {/* Insights: a tinted cell with the chart */}
          <article className="reveal flex flex-col rounded-3xl bg-income-soft p-6 md:col-span-2">
            <ChartLineUp size={26} className="text-income" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold tracking-tight">{f.insights.title}</h3>
            <p className="mt-2 mb-6 text-ink-2">{f.insights.body}</p>
            <div inert className="mt-auto rounded-2xl bg-surface p-4 pt-8">
              <CashFlowChart points={[...POINTS]} height={110} highlight="2026-10" />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// AI: the real answer card on the left, the story on the right
// ---------------------------------------------------------------------------

function AiSection() {
  const { t } = useI18n();
  const example: ChatAnswer = {
    answer: t.landing.aiExampleAnswer,
    verdict: "tight",
    analysis: {
      currency: "MXN",
      price: "9120.00",
      margin: "12400.00",
      precio: "$9,120.00",
      precioOriginal: "US$500.00",
      tipoDeCambio: "1 USD = 18.2400 MXN",
      margenDelMes: "$12,400.00",
      quedariaDespues: "$3,280.00",
    },
    disclaimer: t.landing.aiExampleDisclaimer,
    ai: { used: true, reason: null },
  };
  const icons = [Tag, TrendUp, ShieldCheck];
  return (
    <section id="assistant" className="scroll-mt-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-28">
        {/* Example conversation: the question, then Tally's real answer card */}
        <div inert className="reveal order-2 min-w-0 space-y-3 lg:order-1" aria-hidden>
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-ink px-4 py-2.5 text-[15px] text-surface">{t.landing.aiExampleQuestion}</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full ai-surface">
              <AiMark size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <AnswerCard answer={example} />
            </div>
          </div>
          <p className="pt-1 text-center text-xs text-ink-3">{t.landing.exampleData}</p>
        </div>

        <div className="reveal order-1 min-w-0 lg:order-2">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <AiMark size={18} />
            <span className="ai-text">{t.landing.aiEyebrow}</span>
          </p>
          <h2 className="mt-3 text-[clamp(1.875rem,4vw,2.75rem)] leading-tight font-semibold tracking-tight">{t.landing.aiTitle}</h2>
          <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-ink-2">{t.landing.aiBody}</p>
          <dl className="mt-8 space-y-6">
            {t.landing.aiPoints.map((point, i) => {
              const Icon = icons[i] ?? Tag;
              return (
                <div key={point.title} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-ink" aria-hidden>
                    <Icon size={20} />
                  </span>
                  <div>
                    <dt className="font-semibold">{point.title}</dt>
                    <dd className="mt-1 text-ink-2">{point.body}</dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sharing: centered header, the role ladder, then the three family points
// ---------------------------------------------------------------------------

const ROLES: MemberRole[] = ["owner", "admin", "member", "viewer", "dependent"];

function Sharing({ currency }: Example) {
  const { t } = useI18n();
  const icons = [UserCircle, UsersThree, ArrowsClockwise];
  const people = t.landing.exampleMembers.map((name) => ({ name, imageUrl: null }));
  const format = useMoney();
  return (
    <section id="sharing" className="scroll-mt-20 border-y border-line/70 bg-surface-2/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="reveal mx-auto max-w-[60ch] text-center">
          <h2 className="text-[clamp(1.875rem,4vw,2.75rem)] leading-tight font-semibold tracking-tight">{t.landing.sharingTitle}</h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-2">{t.landing.sharingBody}</p>
        </div>

        {/* The five roles, from full control to view only. Scrolls sideways on phones. */}
        <div className="reveal no-scrollbar -mx-4 mt-12 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {ROLES.map((role) => (
            <article key={role} className="w-64 shrink-0 snap-start rounded-3xl border border-line bg-surface p-5 lg:w-auto">
              <span className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden>
                <RoleIcon role={role} size={20} />
              </span>
              <h3 className="mt-4 font-semibold">{t.roles[role].label}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{t.roles[role].hint}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ul className="reveal space-y-6">
            {t.landing.sharingPoints.map((point, i) => {
              const Icon = icons[i] ?? UsersThree;
              return (
                <li key={point.title} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-surface text-ink" aria-hidden>
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3 className="font-semibold">{point.title}</h3>
                    <p className="mt-1 text-ink-2">{point.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* A shared account's members, as the account page shows them */}
          <div inert className="reveal rounded-3xl border border-line bg-surface p-5" aria-hidden>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{t.landing.exampleAccount}</p>
              <AvatarStack people={people} size={32} />
            </div>
            <ul className="mt-4 divide-y divide-line">
              {[
                { name: people[0].name, role: "owner" as const, note: null },
                { name: people[1].name, role: "admin" as const, note: null },
                { name: people[2].name, role: "dependent" as const, note: t.members.limitSummary(format(1500, { currency })) },
              ].map((row) => (
                <li key={row.name} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{row.name}</span>
                    {row.note ? <span className="block text-sm text-ink-2">{row.note}</span> : null}
                  </span>
                  <RoleBadge role={row.role} />
                </li>
              ))}
            </ul>
            <p className="mt-3 flex items-center gap-2 rounded-2xl bg-warn-soft px-3 py-2.5 text-sm">
              <TxStatusPill status="pending" className="bg-surface" />
              <span className="min-w-0 truncate text-ink-2">{people[2].name}</span>
              <Money value={-420} currency={currency} sign className="ml-auto font-semibold" />
            </p>
            <p className="mt-3 text-center text-xs text-ink-3">{t.landing.exampleData}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Privacy: a plain 2x2 grid, no cards
// ---------------------------------------------------------------------------

function Privacy() {
  const { t } = useI18n();
  const icons = [LockKey, ShieldCheck, AiMarkIcon, SignOut];
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
      <h2 className="reveal max-w-[24ch] text-[clamp(1.875rem,4vw,2.75rem)] leading-tight font-semibold tracking-tight">
        {t.landing.privacyTitle}
      </h2>
      <dl className="reveal mt-10 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-2">
        {t.landing.privacyPoints.map((point, i) => {
          const Icon = icons[i] ?? LockKey;
          return (
            <div key={point.title} className="border-t border-line pt-6">
              <dt className="flex items-center gap-2.5 font-semibold">
                <Icon size={20} aria-hidden /> {point.title}
              </dt>
              <dd className="mt-2 max-w-[48ch] text-ink-2">{point.body}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

// The AI mark, sized like the other icons in the privacy grid
function AiMarkIcon({ size = 20 }: { size?: number }) {
  return <AiMark size={size} />;
}

// ---------------------------------------------------------------------------
// Download: the one full-colour band, same brand gradient as the app's hero card
// ---------------------------------------------------------------------------

function Download() {
  const { t } = useI18n();
  return (
    <section id="download" className="scroll-mt-20 px-4 sm:px-6">
      <div className="reveal relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-[linear-gradient(150deg,#2b48e8_0%,#1e33b8_55%,#16257f_100%)] px-6 py-14 text-white sm:px-12 sm:py-16">
        <span aria-hidden className="pointer-events-none absolute -right-24 -bottom-32 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div>
            <h2 className="text-[clamp(1.875rem,4vw,2.75rem)] leading-tight font-semibold tracking-tight">{t.landing.downloadTitle}</h2>
            <p className="mt-3 max-w-[44ch] text-lg leading-relaxed text-white/80">{t.landing.downloadBody}</p>
          </div>
          <div className="flex flex-col gap-4 lg:items-end">
            {/* White badges on the blue band, for contrast */}
            <div className="flex flex-wrap gap-3 [&_a]:bg-white [&_a]:text-[#12141a]">
              <StoreButtons />
            </div>
            <Link href="/login" className="inline-flex h-11 items-center gap-2 text-[15px] font-medium text-white underline-offset-4 hover:underline">
              {t.landing.getStarted} <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// FAQ: native disclosure, works without JavaScript
// ---------------------------------------------------------------------------

function Faq() {
  const { t } = useI18n();
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
      <h2 className="reveal text-[clamp(1.875rem,4vw,2.75rem)] leading-tight font-semibold tracking-tight">{t.landing.faqTitle}</h2>
      <div className="reveal mt-8 divide-y divide-line border-y border-line">
        {t.landing.faq.map((item) => (
          <details key={item.q} className="group">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-[17px] font-medium [&::-webkit-details-marker]:hidden">
              {item.q}
              <CaretDown size={18} className="shrink-0 text-ink-2 transition-transform duration-200 group-open:rotate-180" aria-hidden />
            </summary>
            <p className="max-w-[60ch] pb-5 leading-relaxed text-ink-2">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

function Footer({ year }: { year: number }) {
  const { t } = useI18n();
  return (
    <footer className="border-t border-line/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div>
          <Brand />
          <p className="mt-3 text-sm text-ink-2">{t.landing.footerTagline}</p>
        </div>
        <nav aria-label={t.landing.nav.menu} className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-3">
          <a href="#features" className="text-ink-2 hover:text-ink">{t.landing.nav.features}</a>
          <a href="#assistant" className="text-ink-2 hover:text-ink">{t.landing.nav.assistant}</a>
          <a href="#sharing" className="text-ink-2 hover:text-ink">{t.landing.nav.sharing}</a>
          <a href="#faq" className="text-ink-2 hover:text-ink">{t.landing.nav.faq}</a>
          <Link href="/login" className="text-ink-2 hover:text-ink">{t.landing.signIn}</Link>
        </nav>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-10 text-xs text-ink-3 sm:px-6">{t.landing.rights(year)}</p>
    </footer>
  );
}
