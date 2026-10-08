"use client";

import {
  ChartLineUp,
  Gear,
  House,
  Plus,
  Receipt,
  SignOut,
  SquaresFour,
  Tag,
  Wallet,
} from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, use } from "react";

import { signOut } from "@/actions/settings";
import type { User } from "@/lib/types";

import { CurrencyMenu } from "./currency-menu";
import { Menu, MenuItem } from "./menu";
import { useQuickAdd } from "./quick-add";
import { ThemeMenu } from "./theme";
import { cn } from "./ui";

const NAV = [
  { href: "/", label: "Home", icon: House },
  { href: "/activity", label: "Activity", icon: Receipt },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/insights", label: "Insights", icon: ChartLineUp },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-full pr-2" aria-label="Tally home">
      <span className="flex size-9 items-center justify-center rounded-[12px] bg-ink text-surface">
        <SquaresFour size={18} weight="fill" />
      </span>
      <span className="text-[17px] font-semibold tracking-tight">Tally</span>
    </Link>
  );
}

export function TopBar({ user }: { user: Promise<User> }) {
  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-bg/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
        <Logo />
        <div className="ml-auto flex items-center gap-1">
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

function Avatar({ user, size = 36 }: { user: User; size?: number }) {
  const initials = (user.name ?? user.email)
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (user.imageUrl) {
    return (
      <Image
        src={user.imageUrl}
        alt=""
        width={size}
        height={size}
        className="rounded-full bg-surface-3"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
    >
      {initials}
    </span>
  );
}

function UserMenu({ user: userPromise }: { user: Promise<User> }) {
  const user = use(userPromise);
  const router = useRouter();
  return (
    <Menu
      label="Account menu"
      panelClassName="w-64"
      trigger={() => (
        <span className="ml-1 flex size-11 items-center justify-center rounded-full transition-transform active:scale-95">
          <Avatar user={user} />
        </span>
      )}
    >
      {(close) => (
        <>
          <div className="flex items-center gap-3 px-3 pt-2 pb-3">
            <Avatar user={user} size={40} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium">{user.name ?? "You"}</p>
              <p className="truncate text-sm text-ink-2">{user.email}</p>
            </div>
          </div>
          <div className="border-t border-line pt-1.5">
            <MenuItem icon={<Tag size={18} />} onClick={() => (close(), router.push("/categories"))}>
              Categories
            </MenuItem>
            <MenuItem icon={<Gear size={18} />} onClick={() => (close(), router.push("/settings"))}>
              Settings
            </MenuItem>
          </div>
          <form action={signOut} className="mt-1.5 border-t border-line pt-1.5">
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-[15px] text-expense transition-colors hover:bg-expense-soft"
            >
              <SignOut size={18} /> Sign out
            </button>
          </form>
        </>
      )}
    </Menu>
  );
}

// Floating dock: the app's primary navigation, with "add" at its center.
// A pill hovering over the content on every screen size, instead of a sidebar.
export function Dock() {
  const pathname = usePathname();
  const { open } = useQuickAdd();
  const reduce = useReducedMotion();
  const left = NAV.slice(0, 2);
  const right = NAV.slice(2);

  const item = ({ href, label, icon: Icon }: (typeof NAV)[number]) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex h-14 min-w-16 flex-col items-center justify-center gap-0.5 rounded-full px-3 text-[11px] font-medium transition-colors sm:h-12 sm:min-w-0 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm",
          active ? "text-ink" : "text-ink-2 hover:text-ink",
        )}
      >
        {active ? (
          <motion.span
            layoutId="dock-active"
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
            className="absolute inset-0 rounded-full bg-surface-3"
          />
        ) : null}
        <Icon size={22} weight={active ? "fill" : "regular"} className="relative" />
        <span className="relative">{label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-5"
    >
      <div className="glass flex w-full max-w-md items-center justify-between gap-1 rounded-full p-1.5 sm:w-auto sm:max-w-none">
        {left.map(item)}
        <button
          type="button"
          onClick={() => open({ mode: "expense" })}
          aria-label="Add entry (N)"
          title="Add entry (N)"
          className="mx-1 flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink shadow-soft transition-[transform,background-color] duration-200 hover:bg-accent-hover active:scale-95 sm:size-12"
        >
          <Plus size={24} weight="bold" />
        </button>
        {right.map(item)}
      </div>
    </nav>
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
          <span className="text-[17px] font-semibold tracking-tight">Tally</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="skeleton h-8 w-16 rounded-full" />
          <div className="skeleton size-9 rounded-full" />
        </div>
      </div>
    </header>
  );
}
