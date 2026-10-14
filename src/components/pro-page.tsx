"use client";

import {
  ArrowCounterClockwise,
  Camera,
  ChatCircleDots,
  Check,
  CheckCircle,
  Crown,
  DownloadSimple,
  LockKey,
  LockSimple,
  SquaresFour,
  WarningCircle,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { openBillingPortal } from "@/actions/billing";
import { useI18n } from "@/i18n/client";
import type { Billing } from "@/lib/types";

import { AiMark } from "./ai-mark";
import { UpgradeSheet, useCheckout } from "./plan";
import { useToast } from "./toast";
import { Button, Card, cn } from "./ui";

// Tally Pro: what you get, side by side with the free plan, and one button.
// Buying and managing happen on Stripe's pages.
export function ProPage({
  billing,
  freeAiLimit,
  returning,
}: {
  // null: billing isn't set up on the server yet
  billing: Billing | null;
  // The free monthly AI requests, from the API's own status
  freeAiLimit: number | null;
  // Back from Stripe Checkout
  returning: boolean;
}) {
  const { t, locale } = useI18n();
  const p = t.pro;
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const checkout = useCheckout();
  const [paying, setPaying] = useState(false);
  const pro = billing?.plan === "pro";
  const pastDue = billing?.subscriptionStatus === "past_due" || billing?.subscriptionStatus === "unpaid";
  const waiting = returning && billing && !pro;

  // Back from Checkout before Stripe's confirmation reached us: check
  // again for a little while (the webhook usually lands in seconds)
  useEffect(() => {
    if (!waiting) return;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      router.refresh();
      if (tries >= 12) clearInterval(id);
    }, 2500);
    return () => clearInterval(id);
  }, [waiting, router]);

  const go = (action: () => Promise<{ error?: string } | void>) =>
    startTransition(async () => {
      const result = await action();
      if (result?.error) toast(result.error, { tone: "error" });
    });

  const renews = billing?.currentPeriodEnd
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date(billing.currentPeriodEnd))
    : null;

  const rows: { icon: typeof Camera; label: string; free: React.ReactNode; pro: React.ReactNode; highlight?: boolean }[] = [
    {
      icon: ChatCircleDots,
      label: p.rows.chat,
      free: freeAiLimit ? p.perMonth(freeAiLimit) : <Check size={18} weight="bold" className="text-ink-3" />,
      pro: <span className="font-semibold">{p.unlimitedShort}</span>,
      highlight: true,
    },
    { icon: Camera, label: p.rows.receipt, free: <LockSimple size={18} className="text-ink-3" />, pro: <Check size={18} weight="bold" className="text-income" /> },
    { icon: DownloadSimple, label: p.rows.export, free: <LockSimple size={18} className="text-ink-3" />, pro: <Check size={18} weight="bold" className="text-income" /> },
    { icon: SquaresFour, label: p.rows.everything, free: <Check size={18} weight="bold" className="text-income" />, pro: <Check size={18} weight="bold" className="text-income" /> },
  ];

  return (
    <>
      <header className="rise flex flex-col items-center pt-4 text-center">
        <span className="flex size-20 items-center justify-center rounded-[1.75rem] ai-surface shadow-float">
          <AiMark size={44} className="buck-hello" />
        </span>
        <h1 className="mt-5 flex items-center gap-2 text-[34px] leading-none font-semibold tracking-tight sm:text-[40px]">
          Tally <span className="ai-text">Pro</span>
        </h1>
        <p className="mt-3 max-w-[34ch] text-lg leading-snug text-ink-2">{p.lead}</p>
      </header>

      {/* Back from Stripe */}
      {returning && pro ? (
        <p className="goal-celebrate mx-auto flex max-w-xl items-center gap-3 rounded-3xl bg-income-soft px-5 py-4 text-income" role="status">
          <CheckCircle size={26} weight="fill" className="shrink-0" aria-hidden />
          <span className="text-[17px] font-semibold">{p.welcome}</span>
        </p>
      ) : waiting ? (
        <p className="mx-auto flex max-w-xl items-center gap-3 rounded-3xl bg-surface-2 px-5 py-4 text-ink-2" role="status">
          <span className="ai-thinking flex gap-1" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          {p.confirming}
        </p>
      ) : null}

      {/* Your plan, when you're Pro */}
      {pro ? (
        <Card className={cn("rise mx-auto flex w-full max-w-xl flex-col gap-4 p-6 sm:flex-row sm:items-center", pastDue && "border-warn/50")}>
          <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", pastDue ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent")}>
            {pastDue ? <WarningCircle size={26} weight="fill" aria-hidden /> : <Crown size={26} weight="fill" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-semibold">{pastDue ? p.pastDue : p.youArePro}</p>
            {renews && !pastDue ? <p className="text-sm text-ink-2">{p.renews(renews)}</p> : null}
          </div>
          <Button variant={pastDue ? "primary" : "secondary"} disabled={pending} onClick={() => go(openBillingPortal)}>
            {pending ? p.opening : pastDue ? p.fixPayment : p.manage}
          </Button>
        </Card>
      ) : null}

      {/* Free vs Pro, row by row: icons first, a word only where needed */}
      <div className="rise mx-auto w-full max-w-2xl" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_6.5rem] items-end gap-x-2 px-2 pb-3 text-sm sm:grid-cols-[minmax(0,1fr)_8rem_9rem]">
          <span />
          <span className="text-center font-medium text-ink-2">{p.free}</span>
          <span className="text-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-[linear-gradient(120deg,var(--ai-1),var(--ai-2))] px-3 py-1 font-semibold text-white">
              <Crown size={13} weight="fill" aria-hidden /> Pro
            </span>
          </span>
        </div>
        <ul className="overflow-hidden rounded-3xl border border-line bg-surface">
          {rows.map(({ icon: Icon, label, free, pro: proValue, highlight }) => (
            <li
              key={label}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_5.5rem_6.5rem] items-center gap-x-2 border-b border-line px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_8rem_9rem]",
                highlight && "bg-accent-soft/60",
              )}
            >
              <span className="flex min-w-0 items-center gap-3 text-[15px] font-medium">
                <Icon size={20} className="shrink-0 text-accent" aria-hidden />
                <span className="min-w-0">{label}</span>
              </span>
              <span className="flex justify-center text-center text-sm text-ink-2">{free}</span>
              <span className="flex justify-center text-center text-sm">{proValue}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* One button */}
      {!pro ? (
        <div className="rise mx-auto flex w-full max-w-md flex-col items-center gap-4" style={{ "--i": 2 } as React.CSSProperties}>
          <Button
            size="lg"
            className="w-full"
            disabled={pending || checkout.pending || !billing}
            onClick={() => (checkout.embedded ? setPaying(true) : checkout.redirect())}
          >
            <Crown size={18} weight="fill" /> {!billing ? p.soon : pending || checkout.pending ? p.opening : p.upgrade}
          </Button>
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-ink-2">
            <li className="flex items-center gap-1.5">
              <LockKey size={16} className="text-accent" aria-hidden /> {p.secure}
            </li>
            <li className="flex items-center gap-1.5">
              <ArrowCounterClockwise size={16} className="text-accent" aria-hidden /> {p.cancel}
            </li>
          </ul>
        </div>
      ) : null}

      {/* Stripe's form, inside the page */}
      <UpgradeSheet open={paying} onClose={() => setPaying(false)} startAtPayment />
    </>
  );
}
