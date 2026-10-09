"use client";

import Link from "next/link";

import { useI18n } from "@/i18n/client";
import { toCents } from "@/lib/money";
import type { Account } from "@/lib/types";

import { AccountIcon } from "./account-icon";
import { Money } from "./preferences";
import { cn } from "./ui";

// Each account type has its own material so they're told apart at a glance:
// cash is a soft teal note, debit is the cobalt card, credit is graphite.
const SKINS = {
  cash: "bg-[linear-gradient(140deg,#0f766e,#115e59_55%,#134e4a)] text-white",
  debit: "bg-[linear-gradient(140deg,#3552f0,#2338c2_60%,#1b2b8f)] text-white",
  creditCard: "bg-[linear-gradient(140deg,#2b2e36,#16181d_60%,#0c0d10)] text-white",
} as const;

export function AccountCard({ account, className, href }: { account: Account; className?: string; href?: string }) {
  const { t } = useI18n();
  const cents = toCents(account.balance);
  const credit = account.type === "creditCard";
  const owed = credit && cents < 0;

  const body = (
    <div
      className={cn(
        "relative flex h-full min-h-40 flex-col justify-between overflow-hidden rounded-3xl p-5 shadow-soft",
        SKINS[account.type],
        !account.isActive && "opacity-60 grayscale",
        className,
      )}
    >
      {/* Soft light falloff, gives the card its material */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/10 blur-2xl"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium">{account.name}</p>
          <p className="text-sm text-white/70">
            {t.accountTypes[account.type].label} · <span translate="no">{account.currency}</span>
          </p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15">
          <AccountIcon type={account.type} size={20} />
        </span>
      </div>
      <div className="relative">
        <p className="text-sm text-white/70">{owed ? t.accountCard.youOwe : credit ? t.accountCard.creditBalance : t.accountCard.available}</p>
        <Money
          cents={credit ? Math.abs(cents) : cents}
          currency={account.currency}
          className="block truncate text-[28px] leading-tight font-semibold tracking-tight"
        />
        {/* In the preferred currency too, when the account uses another one */}
        {account.preferredBalance && account.preferredBalance.currency !== account.currency ? (
          <p className="truncate text-xs text-white/75">
            <Money
              value={credit ? Math.abs(Number(account.preferredBalance.amount)) : account.preferredBalance.amount}
              currency={account.preferredBalance.currency}
              approximate
            />
          </p>
        ) : null}
        {!credit && cents < 0 ? <p className="text-xs text-white/80">{t.accountCard.overdrawn}</p> : null}
      </div>
    </div>
  );

  if (!href) return body;
  return (
    <Link href={href} className="block rounded-3xl transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]">
      {body}
    </Link>
  );
}
