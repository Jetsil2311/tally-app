"use client";

import { ArrowRight, Check, Clock, EnvelopeOpen, UserPlus, X } from "@phosphor-icons/react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { reviewTransaction } from "@/actions/transactions";
import { useI18n } from "@/i18n/client";
import { canReview } from "@/lib/permissions";
import type { Account, Transaction } from "@/lib/types";

import { Avatar, displayName, useViewer } from "./people-ui";
import { Money, useAccountCurrency, usePreferences } from "./preferences";
import { useQuickAdd } from "./quick-add";
import { useToast } from "./toast";
import { VerificationQueue } from "./verification";
import { Button, Card, cn, SectionTitle } from "./ui";

// Dependents' entries waiting for an owner or admin. Approve or reject
// right here; tapping the entry opens it in full.
export function ApprovalQueue({ pending, accounts, limit }: { pending: Transaction[]; accounts: Account[]; limit?: number }) {
  const { t } = useI18n();
  const viewer = useViewer();
  const roleOf = (tx: Transaction) => accounts.find((a) => a.id === tx.accountId)?.myRole;
  // Only entries you can decide on; your own waiting entries show elsewhere
  const reviewable = pending.filter((tx) => canReview(roleOf(tx), tx) && tx.createdBy?.id !== viewer.id);
  if (reviewable.length === 0) return null;
  const shown = limit ? reviewable.slice(0, limit) : reviewable;

  return (
    <Card className="rise border-warn/30 p-3 sm:p-4" aria-labelledby="approvals-title">
      <div className="flex items-start gap-3 px-3 pt-2">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-warn-soft text-warn">
          <Clock size={18} weight="bold" />
        </span>
        <div className="min-w-0 flex-1">
          <SectionTitle id="approvals-title">{t.approvals.title}</SectionTitle>
          <p className="-mt-3 mb-2 text-sm text-ink-2">{t.approvals.hint}</p>
        </div>
      </div>
      <ul>
        {shown.map((tx) => (
          <ApprovalRow key={tx.id} tx={tx} />
        ))}
      </ul>
    </Card>
  );
}

function ApprovalRow({ tx }: { tx: Transaction }) {
  const { t, locale } = useI18n();
  const { timeZone } = usePreferences();
  const { open } = useQuickAdd();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [decided, setDecided] = useState(false);
  const who = displayName(tx.createdBy, t.audit.someone);
  const currency = useAccountCurrency(tx.accountId);
  const when = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone }).format(new Date(tx.date));

  const decide = (approve: boolean) =>
    startTransition(async () => {
      const result = await reviewTransaction(tx.id, approve);
      toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
      if (result.ok) setDecided(true);
    });

  if (decided) return null;
  return (
    <li className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-3 py-2.5 sm:flex-nowrap", pending && "opacity-60")}>
      <button
        type="button"
        onClick={() => open({ transaction: tx })}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-left"
      >
        {tx.createdBy ? <Avatar person={tx.createdBy} size={40} /> : <span className="size-10 shrink-0 rounded-full bg-surface-3" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{tx.description || tx.category?.name || t.common.expense}</span>
          <span className="block truncate text-sm text-ink-2">
            {who} · {tx.account.name} · {when}
          </span>
        </span>
        <Money
          value={tx.type === "income" ? tx.amount : -Number(tx.amount)}
          currency={currency}
          sign
          className="shrink-0 text-[15px] font-semibold"
        />
      </button>
      <div className="flex w-full gap-2 sm:w-auto">
        <Button size="sm" className="flex-1 sm:flex-none" disabled={pending} onClick={() => decide(true)} aria-label={`${t.approvals.approve}: ${who}`}>
          <Check size={16} weight="bold" /> {t.approvals.approve}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="flex-1 sm:flex-none"
          disabled={pending}
          onClick={() => decide(false)}
          aria-label={`${t.approvals.reject}: ${who}`}
        >
          <X size={16} weight="bold" /> {t.approvals.reject}
        </Button>
      </div>
    </li>
  );
}

// Home: everything waiting on you, as one calm stack of links plus the
// approval queue. Renders nothing when there's nothing to do.
export function NeedsAttention({
  invitations,
  requests,
  pending,
  unverified,
  accounts,
}: {
  invitations: number;
  requests: number;
  pending: Transaction[];
  // Recurring charges waiting to be confirmed
  unverified: Transaction[];
  accounts: Account[];
}) {
  const { t } = useI18n();
  const viewer = useViewer();
  const mine = pending.filter((tx) => tx.createdBy?.id === viewer.id).length;
  const links = [
    invitations > 0 && { href: "/people", text: t.attention.invitations(invitations), icon: <EnvelopeOpen size={20} weight="fill" /> },
    requests > 0 && { href: "/people", text: t.attention.requests(requests), icon: <UserPlus size={20} weight="fill" /> },
    mine > 0 && {
      href: `/activity?status=pending&by=${viewer.id}&month=all`,
      text: t.attention.yourPending(mine),
      icon: <Clock size={20} weight="fill" />,
    },
  ].filter(Boolean) as { href: string; text: string; icon: React.ReactNode }[];

  return (
    <>
      {links.length > 0 ? (
        <nav aria-label={t.attention.title} className="rise flex flex-col gap-2">
          {links.map((link) => (
            <Link
              key={link.text}
              href={link.href}
              className="flex items-center gap-3 rounded-3xl border border-accent/20 bg-accent-soft px-5 py-4 transition-colors hover:border-accent/45"
            >
              <span className="shrink-0 text-accent">{link.icon}</span>
              <span className="flex-1 text-[15px] font-medium">{link.text}</span>
              <ArrowRight size={18} className="shrink-0 text-ink-2" />
            </Link>
          ))}
        </nav>
      ) : null}
      <VerificationQueue unverified={unverified} accounts={accounts} limit={3} />
      <ApprovalQueue pending={pending} accounts={accounts} limit={3} />
    </>
  );
}
