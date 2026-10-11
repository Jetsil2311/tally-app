"use client";

import {
  ChartLineUp,
  Gear,
  House,
  Medal,
  PiggyBank,
  Plus,
  Receipt,
  Repeat,
  SignOut,
  SquaresFour,
  Tag,
  UsersThree,
  Wallet,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, use, useState } from "react";

import { signOut } from "@/actions/settings";
import { useI18n } from "@/i18n/client";
import type { User } from "@/lib/types";

import { CurrencyMenu } from "./currency-menu";
import { useAi } from "./ai-assist";
import { AiMark } from "./ai-mark";
import { Avatar } from "./people-ui";
import { Menu, MenuItem } from "./menu";
import { useQuickAdd } from "./quick-add";
import { Sheet } from "./sheet";
import { ThemeMenu } from "./theme";
import { cn } from "./ui";

// Every section, by how often it's used. Core ones are always one tap away
// (dock on phones, sidebar on desktop); the rest sit together in a visible
// hub ("More" on phones), never behind the avatar.
const CORE = [
  { href: "/", key: "home", icon: House },
  { href: "/activity", key: "activity", icon: Receipt },
  { href: "/accounts", key: "accounts", icon: Wallet },
  { href: "/insights", key: "insights", icon: ChartLineUp },
] as const;

const PLAN = [
  { href: "/goals", key: "goals", icon: PiggyBank },
  { href: "/recurring", key: "recurring", icon: Repeat },
  { href: "/categories", key: "categories", icon: Tag },
] as const;

const YOU = [
  { href: "/people", key: "people", icon: UsersThree },
  { href: "/achievements", key: "achievements", icon: Medal },
] as const;

type Section = (typeof CORE)[number] | (typeof PLAN)[number] | (typeof YOU)[number];

// On phones the dock keeps Home, Activity and Insights; Accounts joins the hub
const DOCK = [CORE[0], CORE[1], CORE[3]] as const;
const HUB: readonly Section[] = [CORE[2], ...PLAN, ...YOU];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Logo() {
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

export function TopBar({ user, aiUnseen }: { user: Promise<User>; aiUnseen: Promise<number> }) {
  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-bg/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Suspense fallback={<AssistantButton unseen={0} />}>
            <AssistantButtonWithCount count={aiUnseen} />
          </Suspense>
          <CurrencyMenu />
          <ThemeMenu />
          <Suspense fallback={<div className="skeleton ml-1 size-9 rounded-full" />}>
            <UserMenu user={user} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

// The assistant, from every screen: the AI mark itself is the button
function AssistantButtonWithCount({ count }: { count: Promise<number> }) {
  return <AssistantButton unseen={use(count)} />;
}

function AssistantButton({ unseen }: { unseen: number }) {
  const { t } = useI18n();
  const { open, isOpen } = useAi();
  const label = unseen > 0 ? `${t.ai.open} (${t.ai.newInsightsDot(unseen)})` : t.ai.open;
  // Opens over the current screen: asking never means leaving it
  return (
    <button
      type="button"
      onClick={() => open()}
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      title={label}
      className="ai-chip relative inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium transition-[transform,box-shadow] active:scale-95 sm:pr-4"
    >
      <AiMark size={20} />
      <span className="hidden sm:inline">{t.ai.askAi}</span>
      {unseen > 0 ? <span aria-hidden className="absolute top-1 right-1 size-2.5 rounded-full bg-[var(--ai-2)] ring-2 ring-bg" /> : null}
    </button>
  );
}

// Only about you: who's signed in, settings, sign out. Sections live in the
// sidebar / hub, not here.
function UserMenu({ user: userPromise }: { user: Promise<User> }) {
  const user = use(userPromise);
  const router = useRouter();
  const { t } = useI18n();
  return (
    <Menu
      label={t.nav.accountMenu}
      panelClassName="w-64"
      trigger={() => (
        <span className="relative ml-1 flex size-11 items-center justify-center rounded-full transition-transform active:scale-95">
          <Avatar person={user} />
        </span>
      )}
    >
      {(close) => (
        <>
          <div className="flex items-center gap-3 px-3 pt-2 pb-3">
            <Avatar person={user} size={40} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium">{user.name ?? t.nav.you}</p>
              <p className="truncate text-sm text-ink-2">{user.email}</p>
            </div>
          </div>
          <div className="border-t border-line pt-1.5">
            <MenuItem icon={<Gear size={18} />} onClick={() => (close(), router.push("/settings"))}>
              {t.nav.settings}
            </MenuItem>
          </div>
          <form action={signOut} className="mt-1.5 border-t border-line pt-1.5">
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-[15px] text-expense transition-colors hover:bg-expense-soft"
            >
              <SignOut size={18} /> {t.nav.signOut}
            </button>
          </form>
        </>
      )}
    </Menu>
  );
}

// Connection requests + invitations waiting for an answer: a count on People
function AttentionCount({ attention, dot }: { attention: Promise<number>; dot?: boolean }) {
  const { t } = useI18n();
  const count = use(attention);
  if (!count) return null;
  return dot ? (
    <span aria-label={t.nav.waiting(count)} className="absolute top-1.5 right-[calc(50%-18px)] size-2.5 rounded-full bg-accent ring-2 ring-surface" />
  ) : (
    <span aria-label={t.nav.waiting(count)} className="tabular ml-auto rounded-full bg-accent px-2 py-px text-xs font-semibold text-accent-ink">
      {count}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Desktop: everything visible in a sidebar, grouped, icon + word
// ---------------------------------------------------------------------------

export function Sidebar({ attention }: { attention: Promise<number> }) {
  const pathname = usePathname();
  const { open } = useQuickAdd();
  const { t } = useI18n();

  const link = ({ href, key, icon: Icon }: Section) => {
    const active = isActive(pathname, href);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-[15px] transition-colors",
            active ? "bg-surface-3 font-medium text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
          )}
        >
          <Icon size={20} weight={active ? "fill" : "regular"} aria-hidden />
          <span className="truncate">{t.nav[key]}</span>
          {key === "people" ? (
            <Suspense fallback={null}>
              <AttentionCount attention={attention} />
            </Suspense>
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-bg px-3 pt-4 pb-5 lg:flex">
      <div className="px-2 pb-5">
        <Logo />
      </div>
      <button
        type="button"
        onClick={() => open({ mode: "expense" })}
        className="mb-5 flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-medium text-accent-ink shadow-soft transition-[transform,background-color] hover:bg-accent-hover active:scale-[0.98]"
      >
        <Plus size={18} weight="bold" aria-hidden /> {t.nav.add}
      </button>
      <nav aria-label={t.nav.primary} className="flex-1 space-y-5 overflow-y-auto">
        <ul className="space-y-0.5">{CORE.map(link)}</ul>
        <div>
          <p className="px-3 pb-1.5 text-xs font-medium text-ink-3">{t.nav.groupPlan}</p>
          <ul className="space-y-0.5">{PLAN.map(link)}</ul>
        </div>
        <div>
          <p className="px-3 pb-1.5 text-xs font-medium text-ink-3">{t.nav.groupYou}</p>
          <ul className="space-y-0.5">{YOU.map(link)}</ul>
        </div>
      </nav>
    </aside>
  );
}

// Phones and tablets: a floating dock with the three most used sections,
// "add" at its center, and More: every other section as big icon tiles.
// Desktop uses the sidebar instead.
export function Dock({ attention }: { attention: Promise<number> }) {
  const pathname = usePathname();
  const { open } = useQuickAdd();
  const reduce = useReducedMotion();
  const { t } = useI18n();
  const [hubOpen, setHubOpen] = useState(false);
  const inHub = HUB.some((section) => isActive(pathname, section.href)) || pathname.startsWith("/settings");

  const tab = (key: string, label: string, Icon: typeof House, active: boolean) => (
    <>
      {active ? (
        <motion.span
          layoutId="dock-active"
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
          className="absolute inset-0 rounded-full bg-surface-3"
        />
      ) : null}
      <Icon size={22} weight={active ? "fill" : "regular"} className="relative" aria-hidden />
      <span className="relative max-w-full truncate">{label}</span>
    </>
  );
  const tabClass = (active: boolean) =>
    cn(
      // Equal columns that can shrink (min-w-0): a long label truncates
      // instead of pushing the dock off-screen
      "relative flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[11px] font-medium transition-colors sm:h-12 sm:flex-none sm:flex-row sm:gap-2 sm:px-4 sm:text-sm",
      active ? "text-ink" : "text-ink-2 hover:text-ink",
    );

  const link = ({ href, key, icon }: (typeof DOCK)[number]) => {
    const active = isActive(pathname, href);
    return (
      <Link key={href} href={href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
        {tab(key, t.nav[key], icon, active)}
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label={t.nav.primary}
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-5 lg:hidden"
      >
        <div className="glass flex w-full max-w-md min-w-0 items-center justify-between gap-0.5 rounded-full p-1.5 sm:w-auto sm:max-w-none sm:gap-1">
          {DOCK.slice(0, 2).map(link)}
          <button
            type="button"
            onClick={() => open({ mode: "expense" })}
            aria-label={t.nav.addEntry}
            title={t.nav.addEntry}
            className="mx-0.5 flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink shadow-soft transition-[transform,background-color] duration-200 hover:bg-accent-hover active:scale-95 sm:mx-1 sm:size-12"
          >
            <Plus size={24} weight="bold" />
          </button>
          {DOCK.slice(2).map(link)}
          <button
            type="button"
            onClick={() => setHubOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={hubOpen}
            className={tabClass(inHub)}
          >
            {tab("more", t.nav.more, SquaresFour, inHub)}
            <Suspense fallback={null}>
              <AttentionCount attention={attention} dot />
            </Suspense>
          </button>
        </div>
      </nav>
      <Sheet open={hubOpen} onClose={() => setHubOpen(false)} title={t.nav.more}>
        <Hub attention={attention} onPick={() => setHubOpen(false)} />
      </Sheet>
    </>
  );
}

// Every other section as a tile: a big icon first, one word under it
function Hub({ attention, onPick }: { attention: Promise<number>; onPick: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { open: openAi } = useAi();
  const tile = (active: boolean) =>
    cn(
      "relative flex aspect-[1.1] min-w-0 flex-col items-center justify-center gap-2 rounded-3xl border px-2 text-center text-sm font-medium transition-[background-color,border-color,transform] active:scale-[0.97]",
      active ? "border-accent bg-accent-soft text-ink" : "border-line bg-surface-2 text-ink hover:border-line-strong",
    );
  return (
    <ul className="grid grid-cols-3 gap-3 pb-2">
      {HUB.map(({ href, key, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link href={href} onClick={onPick} aria-current={active ? "page" : undefined} className={tile(active)}>
              <Icon size={28} weight="duotone" className={active ? "text-accent" : "text-ink-2"} aria-hidden />
              <span className="max-w-full truncate">{t.nav[key]}</span>
              {key === "people" ? (
                <Suspense fallback={null}>
                  <AttentionCount attention={attention} dot />
                </Suspense>
              ) : null}
            </Link>
          </li>
        );
      })}
      <li>
        <button type="button" onClick={() => (onPick(), openAi())} className={cn(tile(false), "w-full")}>
          <AiMark size={28} />
          <span className="max-w-full truncate">{t.nav.assistant}</span>
        </button>
      </li>
    </ul>
  );
}

export function TopBarSkeleton() {
  return (
    <header className="sticky top-0 z-30">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[12px] bg-ink text-surface">
            <SquaresFour size={18} weight="fill" />
          </span>
          <span translate="no" className="text-[17px] font-semibold tracking-tight">
            Tally
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="skeleton h-8 w-16 rounded-full" />
          <div className="skeleton size-9 rounded-full" />
        </div>
      </div>
    </header>
  );
}
