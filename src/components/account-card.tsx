"use client";

import Link from "next/link";

import { useI18n } from "@/i18n/client";
import { toCents } from "@/lib/money";
import type { Account } from "@/lib/types";

import { AccountIcon } from "./account-icon";
import { PendingBar } from "./page-transition";
import { Money } from "./preferences";
import { cn } from "./ui";

// Each account type has its own material so they're told apart at a glance:
// cash is a soft teal note, debit is the cobalt card, credit is graphite.
const SKINS = {
  cash: "bg-[radial-gradient(120%_80%_at_100%_0%,rgb(94_234_212/0.35),transparent_55%),linear-gradient(145deg,#0f8a7e,#0f6b62_50%,#0b4a44)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_18px_36px_-20px_rgb(15_118_110/0.8)]",
  debit: "bg-[radial-gradient(120%_80%_at_100%_0%,rgb(140_170_255/0.5),transparent_55%),linear-gradient(145deg,#3a57f2,#2338c2_55%,#16247f)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_18px_36px_-20px_rgb(35_56_194/0.85)]",
  creditCard: "bg-[radial-gradient(120%_80%_at_100%_0%,rgb(255_255_255/0.16),transparent_55%),linear-gradient(145deg,#33363f,#1a1c22_55%,#0b0c0f)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_18px_36px_-20px_rgb(0_0_0/0.7)]",
} as const;

export function AccountCard({ account, className, href }: { account: Account; className?: string; href?: string }) {
  const { t } = useI18n();
  const cents = toCents(account.balance);
  const credit = account.type === "creditCard";
  const owed = credit && cents < 0;

  const body = (
    <div
      className={cn(
        "grain relative isolate flex h-full min-h-44 flex-col justify-between overflow-hidden rounded-3xl p-5",
        SKINS[account.type],
        !account.isActive && "opacity-60 grayscale",
        className,
      )}
    >
      {/* Light sweeping across on hover, and a faint ring pattern: a card */}
      <span aria-hidden className="card-sheen" />
      <svg aria-hidden className="pointer-events-none absolute -right-16 -bottom-24 size-60 text-white/[0.08]" viewBox="0 0 200 200" fill="none">
        {[96, 76, 56, 36].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} stroke="currentColor" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium">{account.name}</p>
          <p className="text-sm text-white/70">
            {t.accountTypes[account.type].label} · <span translate="no">{account.currency}</span>
          </p>
        </div>
        <span className="chip-glass flex size-10 shrink-0 items-center justify-center rounded-2xl">
          <AccountIcon type={account.type} size={20} />
        </span>
      </div>
      <div className="relative">
        <p className="text-sm text-white/70">{owed ? t.accountCard.youOwe : credit ? t.accountCard.creditBalance : t.accountCard.available}</p>
        <Money
          cents={credit ? Math.abs(cents) : cents}
          currency={account.currency}
          className="font-display block truncate text-[30px] leading-tight font-semibold tracking-[-0.035em]"
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
        {/* Recurring charges waiting to be confirmed: the balance above
            leaves them out, this is what it becomes once they're verified */}
        {account.unverified?.count ? (
          <p className="mt-1 truncate text-xs text-white/80">
            {t.verify.projected(
              <Money
                value={credit ? Math.abs(Number(account.projectedBalance)) : account.projectedBalance}
                currency={account.currency}
                className="font-medium text-white"
              />,
            )}{" "}
            · {t.verify.waiting(account.unverified.count)}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (!href) return body;
  return (
    <Link
      href={href}
      className="group block rounded-3xl transition-[translate,scale,rotate] duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:-rotate-[0.6deg] active:scale-[0.97] active:duration-150"
    >
      {body}
      <PendingBar />
    </Link>
  );
}
