"use client";

import {
  AppleLogo,
  ArrowDown,
  ArrowRight,
  ArrowsLeftRight,
  ArrowUp,
  BellRinging,
  Broom,
  CalendarBlank,
  Camera,
  CaretDown,
  ChartLineUp,
  ChartPieSlice,
  Check,
  CreditCard,
  CurrencyCircleDollar,
  DownloadSimple,
  Globe,
  GooglePlayLogo,
  LockKey,
  LockSimple,
  PiggyBank,
  Repeat,
  Scales,
  ShieldCheck,
  SquaresFour,
  Tag,
  UploadSimple,
  UserCircle,
  UsersThree,
  Wallet,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRef } from "react";

import { useI18n } from "@/i18n/client";
import type { Badge, Budget, ChatAnswer, MemberRole, SavingsGoal } from "@/lib/types";

import { AiMark } from "./ai-mark";
import { AnswerCard } from "./assistant";
import { BadgeMedal } from "./badges";
import { BudgetMeter } from "./budgets";
import { GoalIcon, GoalMeter } from "./goals";
import { Avatar, AvatarStack, RoleBadge, RoleIcon } from "./people-ui";
import { Money } from "./preferences";
import { buttonClass, cn } from "./ui";

// The public landing page. Every product visual is a real Tally component
// rendered with example data (and labelled as such), never a drawn mock-up.

// Store listings: placeholders until the apps are published. Replace the
// "#" with the real App Store / Google Play URLs.
export const STORE_LINKS = { ios: "#", android: "#" } as const;

type Example = { currency: string };


export function Landing({ currency, year }: Example & { year: number }) {
  const { t } = useI18n();
  return (
    <div className="landing-motion min-h-dvh overflow-x-clip bg-bg">
      <a
        href="#main"
        className="sr-only z-60 rounded-full bg-ink px-4 py-2 text-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t.nav.skipToContent}
      </a>
      <Nav />
      <main id="main">
        <Hero currency={currency} />
        <Highlights currency={currency} />
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
// Tilt: the surface leans toward the pointer and a soft light follows it.
// Writes CSS variables straight to the element (no re-render per mouse
// move); the .tilt styles only apply with a mouse and without reduced motion.
// ---------------------------------------------------------------------------

function Tilt({ children, className, max = 6 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || event.pointerType !== "mouse") return;
    const box = el.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    el.dataset.active = "";
    el.style.setProperty("--ry", `${(x - 0.5) * max * 2}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * max * 2}deg`);
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    delete el.dataset.active;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={cn("tilt relative", className)}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero: what it is in one line, then a picture of the app with what makes it
// different floating around it (Buck, budget alerts, receipts, achievements).
// The first 10 seconds should be enough to get it.
// ---------------------------------------------------------------------------

function Hero({ currency }: Example) {
  const { t } = useI18n();
  const l = t.landing;
  const trust = [
    { icon: LockKey, label: l.trust.noBank },
    { icon: Globe, label: l.trust.anyCurrency },
    { icon: UsersThree, label: l.trust.shared },
  ];
  return (
    <section className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 -z-0 h-[640px] bg-[radial-gradient(50%_55%_at_75%_35%,var(--accent-soft),transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 pt-8 pb-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-6 lg:pt-14 lg:pb-20">
        <div className="min-w-0 text-center lg:text-left">
          <p className="rise ai-chip inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium">
            <AiMark size={16} /> {l.heroEyebrow}
          </p>
          <h1
            className="rise mt-5 text-[clamp(2.6rem,8vw,4.5rem)] leading-[1] font-semibold tracking-tighter"
            style={{ "--i": 1 } as React.CSSProperties}
          >
            {l.heroTitle}
          </h1>
          <p
            className="rise mx-auto mt-5 max-w-[34ch] text-xl leading-snug text-ink-2 lg:mx-0"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            {l.heroBody}
          </p>
          <div className="rise mt-8 flex flex-col items-center gap-4 lg:items-start" style={{ "--i": 3 } as React.CSSProperties}>
            <Link
              href="/login"
              className={cn(
                buttonClass("primary", "lg"),
                "group w-full transition-[transform,translate,scale,rotate,box-shadow,background-color] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_var(--accent)] sm:w-fit sm:px-8",
              )}
            >
              {l.getStarted} <ArrowRight size={18} weight="bold" className="transition-transform group-hover:translate-x-1" />
            </Link>
            <StoreButtons className="w-full justify-center sm:w-auto lg:justify-start" />
          </div>
          <ul className="rise mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-[15px] text-ink-2 lg:justify-start" style={{ "--i": 4 } as React.CSSProperties}>
            {trust.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon size={18} weight="duotone" className="text-accent" aria-hidden /> {label}
              </li>
            ))}
          </ul>
        </div>

        <HeroScene currency={currency} />
      </div>
    </section>
  );
}

// The phone shows Home as it really looks; the cards around it are moments
// from the app, each one a differentiator. A picture, not a UI: inert.
function HeroScene({ currency }: Example) {
  const { t } = useI18n();
  const l = t.landing;
  const g = t.home.glance;
  const income = 4120;
  const spent = 1843.3;
  // Outer: where it sits and how far it floats above the phone. Inner: the
  // card and its idle drift (two transforms, two elements)
  const layer = "absolute z-10";
  const callout = "rounded-2xl border border-line bg-surface p-3 shadow-float";
  return (
    <div className="rise relative min-w-0" style={{ "--i": 3 } as React.CSSProperties} role="img" aria-label={l.previewLabel}>
      <Tilt max={7} className="mx-auto w-full max-w-[30rem]">
      <div inert aria-hidden className="tilt-3d relative h-[520px] w-full sm:h-[570px]">
        {/* The phone */}
        {/* A light hairline on the bezel keeps the phone's edge visible on a dark page */}
        <div className="tilt-3d absolute top-10 left-1/2 w-[16.5rem] -translate-x-1/2 sm:w-[18.5rem]">
        <div className="depth-1 relative rounded-[2.6rem] bg-[#16181e] p-2 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.7),0_12px_30px_-12px_rgb(43_72_232/0.35)] ring-1 ring-white/15">
          <span className="tilt-glare z-20" />
          <div className="relative h-[465px] overflow-hidden rounded-[2.15rem] bg-bg px-3.5 pt-9 sm:h-[505px]">
            <span className="absolute top-2.5 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-[#16181e]" />
            <p className="px-1 text-[13px] text-ink-2">{l.phoneMonth}</p>
            <p className="px-1 text-[19px] leading-tight font-semibold tracking-tight">{l.phoneGreeting}</p>

            {/* Total, like Home's blue card */}
            <div className="mt-3 rounded-[1.4rem] bg-[linear-gradient(150deg,#2b48e8_0%,#1e33b8_55%,#16257f_100%)] p-4 text-white">
              <p className="text-[11px] font-medium text-white/75">{t.home.total}</p>
              <Money value={8462.4} currency={currency} className="block text-[28px] leading-none font-semibold tracking-tighter" />
              <div className="mt-3 flex gap-1.5">
                <span className="flex items-center gap-1 rounded-full bg-white/15 py-1 pr-2.5 pl-1.5 text-[11px]">
                  <Wallet size={12} weight="fill" /> <Money value={9074.49} currency={currency} />
                </span>
                <span className="flex items-center gap-1 rounded-full bg-white/15 py-1 pr-2.5 pl-1.5 text-[11px]">
                  <CreditCard size={12} weight="fill" /> <Money value={-612.09} currency={currency} sign />
                </span>
              </div>
            </div>

            {/* This month, like Home's card */}
            <div className="mt-3 rounded-[1.4rem] border border-line bg-surface p-4">
              <p className="text-[11px] font-medium text-ink-2">{g.left}</p>
              <Money value={income - spent} currency={currency} sign className="block text-[24px] leading-none font-semibold tracking-tight text-income" />
              <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-income">
                <span className="absolute inset-y-0 left-0 rounded-full bg-chart-expense ring-2 ring-surface" style={{ width: `${(spent / income) * 100}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <p>
                  <span className="flex items-center gap-1 text-ink-2">
                    <span className="flex size-3.5 items-center justify-center rounded-full bg-income text-surface">
                      <ArrowDown size={8} weight="bold" />
                    </span>
                    {g.in}
                  </span>
                  <Money value={income} currency={currency} sign className="text-[14px] font-semibold" />
                </p>
                <p>
                  <span className="flex items-center gap-1 text-ink-2">
                    <span className="flex size-3.5 items-center justify-center rounded-full bg-chart-expense text-surface">
                      <ArrowUp size={8} weight="bold" />
                    </span>
                    {g.out}
                  </span>
                  <Money value={-spent} currency={currency} sign className="text-[14px] font-semibold" />
                </p>
              </div>
            </div>

            {/* Quick actions, like Home's first row */}
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {[
                { icon: ArrowUp, tone: "bg-accent text-accent-ink" },
                { icon: ArrowDown, tone: "bg-income-soft text-income" },
                { icon: ArrowsLeftRight, tone: "bg-surface-3 text-ink" },
                { icon: null, tone: "ai-chip" },
              ].map(({ icon: Icon, tone }, i) => (
                <span key={i} className={cn("flex aspect-square items-center justify-center rounded-2xl", tone)}>
                  {Icon ? <Icon size={18} weight="bold" /> : <AiMark size={20} />}
                </span>
              ))}
            </div>
          </div>
        </div>
        </div>

        {/* Buck: ask before you buy */}
        <div className={cn(layer, "depth-3 top-0 left-0 w-[12.5rem] sm:w-[14rem]")}>
        <div className={cn(callout, "float-a")}>
          <p className="rounded-2xl rounded-br-md bg-ink px-3 py-2 text-[12px] leading-snug text-surface">{l.calloutAsk}</p>
          <p className="mt-2 flex items-center gap-1.5 rounded-full bg-warn-soft px-2.5 py-1 text-[12px] font-semibold text-warn">
            <AiMark size={14} /> {t.ai.verdict.tight.label}
          </p>
        </div>
        </div>

        {/* A budget speaks up */}
        <div className={cn(layer, "depth-2 top-[44%] right-0 w-[11.5rem] sm:w-[13rem]")}>
        <div className={cn(callout, "float-b border-expense/30")}>
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-expense">
            <WarningCircle size={16} weight="fill" /> {l.calloutBudget}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <span className="block h-full w-full rounded-full bg-expense" />
          </div>
        </div>
        </div>

        {/* A receipt, read by Buck */}
        <div className={cn(layer, "depth-2 bottom-24 left-0 w-[12rem] sm:bottom-28 sm:w-[13.5rem]")}>
        <div className={cn(callout, "float-c flex items-center gap-2.5")}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl ai-surface">
            <Camera size={18} />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1 text-[11px] text-ink-2">
              <AiMark size={11} /> {l.calloutReceipt}
            </span>
            <span className="flex items-baseline gap-1.5">
              <Money value={-248.5} currency={currency} sign className="text-[15px] font-semibold" />
              <span className="truncate text-[12px] text-ink-2">{l.exampleFood}</span>
            </span>
          </span>
        </div>
        </div>

        {/* An achievement pops up */}
        <div className={cn(layer, "depth-3 right-2 bottom-4 sm:right-4")}>
        <div className={cn(callout, "float-a flex items-center gap-2.5 pr-4")}>
          <BadgeMedal badge={EXAMPLE_BADGE} size="sm" />
          <span>
            <span className="block text-[11px] text-ink-2">{t.badges.newBadge}</span>
            <span className="block text-[14px] font-semibold">{t.badges.catalog.first_deposit?.name}</span>
          </span>
        </div>
        </div>
      </div>
      </Tilt>
      <p className="mt-2 text-center text-xs text-ink-3">{l.exampleData}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Why Tally: six differentiators, each a small picture with a few words
// ---------------------------------------------------------------------------

function Highlights({ currency }: Example) {
  const { t } = useI18n();
  const h = t.landing.highlights;
  // Hover: the tile lifts with a deeper shadow, and its picture comes alive
  // (each one has its own small move, driven by group-hover)
  const tile =
    "reveal group flex flex-col rounded-3xl border border-line bg-surface p-5 transition-[transform,translate,scale,rotate,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1.5 hover:border-line-strong hover:shadow-float motion-reduce:transition-none motion-reduce:hover:translate-y-0";
  const stage =
    "flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-surface-2 px-4 transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100";
  return (
    <section id="features" className="scroll-mt-20 border-t border-line/70 bg-surface-2/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <h2 className="reveal text-center text-[clamp(1.875rem,4.5vw,3rem)] leading-tight font-semibold tracking-tight">
          {t.landing.highlightsTitle}
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Ask Buck */}
          <article className={tile}>
            <div inert aria-hidden className={cn(stage, "ai-surface flex-col items-stretch justify-center gap-2")}>
              <p className="self-end rounded-2xl rounded-br-md bg-ink px-3 py-2 text-[13px] text-surface transition-transform duration-300 group-hover:-translate-y-1">{t.landing.calloutAsk}</p>
              <p className="flex origin-left items-center gap-2 self-start rounded-2xl rounded-bl-md bg-surface px-3 py-2 text-[13px] font-semibold shadow-soft transition-transform delay-75 duration-300 group-hover:translate-x-1 group-hover:scale-105">
                <AiMark size={16} />
                <span className="text-income">{t.ai.verdict.comfortable.label}</span>
              </p>
            </div>
            <Highlight icon={<AiMark size={20} />} title={h.ask.title} line={h.ask.line} />
          </article>

          {/* Receipt -> entry */}
          <article className={tile}>
            <div inert aria-hidden className={cn(stage, "gap-3")}>
              <div className="w-20 rotate-[-4deg] rounded-md bg-white px-2 pt-2 pb-3 text-[#12141a] shadow-soft transition-transform duration-500 group-hover:-translate-y-1.5 group-hover:rotate-0 group-hover:shadow-float">
                <div className="mx-auto h-1.5 w-10 rounded bg-[#12141a]/70" />
                {[0, 1, 2].map((i) => (
                  <div key={i} className="mt-1.5 flex justify-between gap-1">
                    <span className="h-1 w-8 rounded bg-[#12141a]/25" />
                    <span className="h-1 w-3 rounded bg-[#12141a]/25" />
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-dashed border-[#12141a]/30 pt-1.5">
                  <span className="h-1.5 w-6 rounded bg-[#12141a]/60" />
                  <span className="h-1.5 w-5 rounded bg-[#12141a]/60" />
                </div>
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full ai-surface transition-transform duration-700 group-hover:rotate-[360deg]">
                <AiMark size={16} />
              </span>
              <div className="min-w-0 rounded-2xl bg-surface px-3 py-2.5 shadow-soft transition-transform delay-150 duration-300 group-hover:translate-x-1 group-hover:scale-105">
                <p className="truncate text-[13px] font-medium">{t.landing.exampleFood}</p>
                <Money value={-248.5} currency={currency} sign className="text-[15px] font-semibold" />
              </div>
            </div>
            <Highlight icon={<Camera size={20} />} title={h.receipt.title} line={h.receipt.line} />
          </article>

          {/* Budgets that warn */}
          <article className={tile}>
            <div inert aria-hidden className={cn(stage, "flex-col items-stretch gap-3")}>
              {[exampleBudget("food", t.landing.exampleFood, 3000, 1240, currency), exampleBudget("fun", t.landing.exampleFun, 1200, 1320, currency)].map((budget) => (
                <div key={budget.id}>
                  <p className="flex justify-between text-[13px]">
                    <span className="font-medium">{budget.category}</span>
                    {budget.overBudget ? (
                      <WarningCircle size={16} weight="fill" className="text-expense transition-transform duration-300 group-hover:scale-125" />
                    ) : null}
                  </p>
                  <BudgetMeter
                    budget={budget}
                    className={cn(
                      "mt-1.5 transition-shadow duration-300",
                      budget.overBudget && "group-hover:shadow-[0_0_18px_-2px_var(--expense)]",
                    )}
                  />
                </div>
              ))}
            </div>
            <Highlight icon={<ChartPieSlice size={20} />} title={h.budgets.title} line={h.budgets.line} />
          </article>

          {/* Shared and fair */}
          <article className={tile}>
            <div inert aria-hidden className={cn(stage, "gap-3")}>
              <Avatar person={{ name: t.landing.exampleMembers[0], imageUrl: null }} size={44} />
              <span className="flex flex-col items-center">
                <Money value={350} currency={currency} className="text-[15px] font-semibold transition-transform duration-300 group-hover:-translate-y-0.5" />
                <ArrowRight size={22} weight="bold" className="text-accent transition-transform duration-300 group-hover:translate-x-2" />
              </span>
              <Avatar person={{ name: t.landing.exampleMembers[1], imageUrl: null }} size={44} />
              <span className="ml-1 flex size-8 items-center justify-center rounded-full bg-income text-surface transition-transform delay-150 duration-300 group-hover:scale-125">
                <Check size={16} weight="bold" />
              </span>
            </div>
            <Highlight icon={<Scales size={20} />} title={h.together.title} line={h.together.line} />
          </article>

          {/* Cards and MSI */}
          <article className={tile}>
            <div inert aria-hidden className={cn(stage, "flex-col items-stretch gap-3")}>
              <div className="flex items-center justify-between gap-2">
                <Money value={1884.5} currency={currency} className="text-[19px] font-semibold tracking-tight" />
                <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-1 text-[12px] font-medium text-warn transition-transform duration-300 group-hover:scale-110">
                  <CalendarBlank size={13} weight="fill" /> {t.landing.exampleDue}
                </span>
              </div>
              <div>
                <p className="flex justify-between text-[12px]">
                  <span className="font-medium">{t.landing.exampleMsi}</span>
                  <span className="tabular text-ink-2">4/12</span>
                </p>
                <div className="mt-1.5 flex gap-0.5">
                  {Array.from({ length: 12 }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-2 flex-1 rounded-full transition-colors duration-300",
                        i < 4 ? "bg-income" : i === 4 ? "bg-surface-3 delay-150 group-hover:bg-income" : "bg-surface-3",
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
            <Highlight icon={<CreditCard size={20} />} title={h.cards.title} line={h.cards.line} />
          </article>

          {/* Goals and achievements */}
          <article className={tile}>
            <div inert aria-hidden className={cn(stage, "gap-4")}>
              <div className="min-w-0 flex-1 rounded-2xl bg-surface p-3 shadow-soft transition-transform duration-300 group-hover:-translate-y-1">
                <p className="flex items-center gap-2 text-[13px] font-medium">
                  <GoalIcon icon="plane" />
                  <span className="truncate">{t.landing.exampleGoal}</span>
                </p>
                <GoalMeter goal={exampleGoal(currency, t.landing.exampleGoal)} className="mt-3" />
              </div>
              <span className="transition-transform duration-500 group-hover:scale-115 group-hover:rotate-12">
                <BadgeMedal badge={EXAMPLE_BADGE} />
              </span>
            </div>
            <Highlight icon={<PiggyBank size={20} />} title={h.goals.title} line={h.goals.line} />
          </article>
        </div>

        {/* Everything else, as chips */}
        <ul className="reveal mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-2">
          {[
            { icon: Repeat, label: t.landing.also.recurring },
            { icon: ChartLineUp, label: t.landing.also.reports },
            { icon: Tag, label: t.landing.also.categories },
            { icon: CurrencyCircleDollar, label: t.landing.also.currencies },
            { icon: UploadSimple, label: t.landing.also.import },
            { icon: DownloadSimple, label: t.landing.also.export },
            { icon: LockSimple, label: t.landing.also.private },
            { icon: Broom, label: t.landing.also.chores },
          ].map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="group flex min-h-10 cursor-default items-center gap-2 rounded-full border border-line bg-surface px-4 text-[15px] transition-[transform,translate,scale,rotate,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-soft"
            >
              <Icon size={17} className="text-accent transition-transform duration-200 group-hover:scale-125" aria-hidden /> {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Highlight({ icon, title, line }: { icon: React.ReactNode; title: string; line: string }) {
  return (
    <div className="mt-4 flex items-start gap-3 px-1">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition-[background-color,color,transform,translate,scale,rotate] duration-300 group-hover:-rotate-6 group-hover:bg-accent group-hover:text-accent-ink"
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-lg leading-snug font-semibold tracking-tight">{title}</h3>
        <p className="mt-0.5 text-[15px] leading-snug text-ink-2">{line}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buck: the real answer card, and four things he does
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
  const icons = [Tag, Camera, BellRinging, ShieldCheck];
  return (
    <section id="assistant" className="scroll-mt-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <div className="reveal min-w-0">
          <AiMark size={56} className="buck-hello" />
          <h2 className="mt-4 text-[clamp(1.875rem,4.5vw,3rem)] leading-tight font-semibold tracking-tight">{t.landing.aiTitle}</h2>
          <p className="mt-3 max-w-[40ch] text-lg leading-snug text-ink-2">{t.landing.aiBody}</p>
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {t.landing.aiPoints.map((point, i) => {
              const Icon = icons[i] ?? Tag;
              return (
                <li
                  key={point}
                  className="group flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3.5 text-[15px] font-medium transition-[transform,translate,scale,rotate,background-color] duration-200 hover:-translate-y-0.5 hover:bg-surface-3"
                >
                  <Icon size={20} className="shrink-0 text-accent transition-transform duration-200 group-hover:scale-125" aria-hidden /> {point}
                </li>
              );
            })}
          </ul>
        </div>

        {/* The question, then Tally's real answer card */}
        <Tilt max={4} className="min-w-0">
        <div inert className="reveal tilt-3d min-w-0 space-y-3" aria-hidden>
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-ink px-4 py-2.5 text-[15px] text-surface">{t.landing.aiExampleQuestion}</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full ai-surface">
              <AiMark size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="depth-1 rounded-3xl shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]">
                <AnswerCard answer={example} />
              </div>
            </div>
          </div>
          <p className="pt-1 text-center text-xs text-ink-3">{t.landing.exampleData}</p>
        </div>
        </Tilt>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sharing: one shared account, as the app shows it, and the roles as chips
// ---------------------------------------------------------------------------

const ROLES: MemberRole[] = ["owner", "admin", "member", "viewer", "dependent"];

function Sharing({ currency }: Example) {
  const { t } = useI18n();
  const icons = [Broom, Scales, LockSimple, UserCircle];
  const people = t.landing.exampleMembers.map((name) => ({ name, imageUrl: null }));
  return (
    <section id="sharing" className="scroll-mt-20 border-y border-line/70 bg-surface-2/40">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
        {/* A shared account: members, a chore, who owes whom */}
        <Tilt max={5} className="order-2 min-w-0 lg:order-1">
        <div inert aria-hidden className="reveal relative min-w-0 rounded-3xl border border-line bg-surface p-5 shadow-[0_40px_80px_-36px_rgb(0_0_0/0.7)]">
          <span className="tilt-glare" />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[17px] font-semibold">{t.landing.exampleAccount}</p>
            <AvatarStack people={people} size={32} />
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {[
              { name: people[0].name, role: "owner" as const },
              { name: people[1].name, role: "admin" as const },
              { name: people[2].name, role: "dependent" as const },
            ].map((row) => (
              <span key={row.name} className="flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pr-1 pl-1">
                <Avatar person={{ name: row.name, imageUrl: null }} size={24} />
                <span className="text-[13px] font-medium">{row.name.split(" ")[0]}</span>
                <RoleBadge role={row.role} />
              </span>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <p className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-income text-surface">
                <Check size={15} weight="bold" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{t.landing.exampleChore}</span>
              <Money value={50} currency={currency} sign className="font-semibold text-income" />
            </p>
            <p className="flex items-center gap-3 rounded-2xl bg-accent-soft px-3 py-2.5">
              <Scales size={20} className="shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate text-[15px]">
                {people[1].name.split(" ")[0]} → {people[0].name.split(" ")[0]}
              </span>
              <Money value={350} currency={currency} className="font-semibold" />
            </p>
            <p className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5">
              <LockSimple size={20} weight="fill" className="shrink-0 text-ink-3" />
              <span className="min-w-0 flex-1 truncate text-[15px] text-ink-2">{t.landing.examplePrivate}</span>
              <Money value={-180} currency={currency} sign className="font-semibold" />
            </p>
          </div>
          <p className="mt-3 text-center text-xs text-ink-3">{t.landing.exampleData}</p>
        </div>
        </Tilt>

        <div className="reveal order-1 min-w-0 lg:order-2">
          <h2 className="text-[clamp(1.875rem,4.5vw,3rem)] leading-tight font-semibold tracking-tight">{t.landing.sharingTitle}</h2>
          <p className="mt-3 max-w-[40ch] text-lg leading-snug text-ink-2">{t.landing.sharingBody}</p>
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {t.landing.sharingPoints.map((point, i) => {
              const Icon = icons[i] ?? UsersThree;
              return (
                <li
                  key={point}
                  className="group flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 text-[15px] font-medium transition-[transform,translate,scale,rotate,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <Icon size={20} className="shrink-0 text-accent transition-transform duration-200 group-hover:scale-125" aria-hidden /> {point}
                </li>
              );
            })}
          </ul>
          {/* The five roles, as the app labels them */}
          <ul className="mt-6 flex flex-wrap gap-2" aria-label={t.landing.rolesLabel}>
            {ROLES.map((role) => (
              <li key={role} className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm" title={t.roles[role].hint}>
                <RoleIcon role={role} size={15} /> {t.roles[role].label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Privacy: four promises, icon + a few words
// ---------------------------------------------------------------------------

function Privacy() {
  const { t } = useI18n();
  const icons = [LockKey, ShieldCheck, AiMarkIcon, DownloadSimple];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <h2 className="reveal text-center text-[clamp(1.875rem,4.5vw,3rem)] leading-tight font-semibold tracking-tight">{t.landing.privacyTitle}</h2>
      <ul className="reveal mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {t.landing.privacyPoints.map((point, i) => {
          const Icon = icons[i] ?? LockKey;
          return (
            <li
              key={point.title}
              className="group rounded-3xl border border-line bg-surface p-5 transition-[transform,translate,scale,rotate,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-float"
            >
              <span
                className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent transition-[background-color,color,transform,translate,scale,rotate] duration-300 group-hover:scale-110 group-hover:bg-accent group-hover:text-accent-ink"
                aria-hidden
              >
                <Icon size={22} />
              </span>
              <h3 className="mt-4 text-[17px] leading-snug font-semibold">{point.title}</h3>
              <p className="mt-1 text-[15px] leading-snug text-ink-2">{point.body}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// The AI mark, sized like the other icons in the privacy grid
function AiMarkIcon({ size = 20 }: { size?: number }) {
  return <AiMark size={size} />;
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function Brand() {
  const { t } = useI18n();
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-full pr-2" aria-label={t.nav.tallyHome}>
      <span className="tactile flex size-9 items-center justify-center rounded-xl">
        <SquaresFour size={18} weight="fill" />
      </span>
      <span translate="no" className="font-display text-[19px] font-semibold tracking-[-0.03em]">
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
    "inline-flex h-14 min-w-0 flex-1 items-center gap-3 rounded-full bg-ink pr-5 pl-4 text-surface transition-[transform,translate,scale,rotate,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-float active:scale-[0.98] sm:min-w-44 sm:flex-none sm:pr-6";
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

// Example data for the Plan cells
function exampleBudget(id: string, category: string, limit: number, spent: number, currency: string): Budget {
  return {
    id,
    accountId: null,
    categoryId: id,
    category,
    currency,
    rollover: false,
    amount: limit.toFixed(2),
    limit: limit.toFixed(2),
    spent: spent.toFixed(2),
    remaining: (limit - spent).toFixed(2),
    progress: Math.round((spent / limit) * 100),
    overBudget: spent > limit,
  };
}

function exampleGoal(currency: string, name: string): SavingsGoal {
  return {
    id: "g",
    name,
    icon: "plane",
    targetAmount: "25000.00",
    saved: "17000.00",
    currency,
    progress: 68,
    status: "active",
    completedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
  };
}

const EXAMPLE_BADGE: Badge = {
  key: "first_deposit",
  name: "",
  description: "",
  icon: "",
  category: "goals",
  earned: true,
  earnedAt: null,
};

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
