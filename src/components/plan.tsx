"use client";

import { Camera, ChatCircleDots, Check, Crown, DownloadSimple, Lightning } from "@phosphor-icons/react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import Link from "next/link";
import { createContext, use, useState, useTransition, type ReactNode } from "react";

import { createEmbeddedCheckout, startCheckout } from "@/actions/billing";
import { useI18n } from "@/i18n/client";
import type { Billing } from "@/lib/types";

import { AiMark } from "./ai-mark";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, cn } from "./ui";

// The user's plan, for showing what's Pro where it's used (a lock chip on
// receipt scanning, export...). A promise so the shell never waits for it.
// null billing = not set up on the API: nothing Pro is shown at all.

// `stripeKey`: Stripe's publishable key, to mount Checkout inside the page;
// null = Checkout opens on Stripe's own page instead
type PlanContext = { billing: Promise<Billing | null>; stripeKey: string | null };

const Context = createContext<PlanContext | null>(null);

export function PlanProvider({
  billing,
  stripeKey,
  children,
}: {
  billing: Promise<Billing | null>;
  stripeKey: string | null;
  children: ReactNode;
}) {
  return <Context value={{ billing, stripeKey }}>{children}</Context>;
}

// Stripe.js loads once per key, and only when a checkout is opened
const stripes = new Map<string, Promise<Stripe | null>>();
function stripeFor(key: string) {
  if (!stripes.has(key)) stripes.set(key, loadStripe(key));
  return stripes.get(key)!;
}

// Stripe's Checkout form inside Tally (Stripe renders it in its own frame
// and handles the card; nothing touches our servers). When the payment
// goes through, Stripe sends the page to /pro, which confirms it.
export function CheckoutPanel() {
  const { t } = useI18n();
  const value = use(Context);
  const [error, setError] = useState<string | null>(null);
  if (!value?.stripeKey) return null;
  if (error) {
    return (
      <p role="alert" className="rounded-2xl bg-expense-soft px-4 py-3 text-sm text-expense">
        {error}
      </p>
    );
  }
  return (
    // Stripe draws its form on white; a white card keeps it whole in dark mode
    <div className="min-h-[28rem] overflow-hidden rounded-3xl bg-white p-1 sm:p-2">
      <EmbeddedCheckoutProvider
        stripe={stripeFor(value.stripeKey)}
        options={{
          fetchClientSecret: async () => {
            const result = await createEmbeddedCheckout();
            if (!result.clientSecret) {
              setError(result.error ?? t.common.somethingWrong);
              throw new Error(result.error ?? "checkout");
            }
            return result.clientSecret;
          },
        }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

// Opens checkout: inside the page when the key is there, otherwise on
// Stripe's page
export function useCheckout() {
  const value = use(Context);
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const embedded = Boolean(value?.stripeKey);
  return {
    embedded,
    pending,
    redirect: () =>
      startTransition(async () => {
        const result = await startCheckout();
        if (result?.error) toast(result.error, { tone: "error" });
      }),
  };
}

// "pro" | "free" | "off" (billing not available)
export function usePlan(): "pro" | "free" | "off" {
  const value = use(Context);
  const billing = value ? use(value.billing) : null;
  return billing ? billing.plan : "off";
}

// A small crown chip next to a Pro feature
export function ProChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-[linear-gradient(120deg,var(--ai-1),var(--ai-2))] px-2 py-0.5 text-[11px] font-semibold text-white",
        className,
      )}
    >
      <Crown size={11} weight="fill" aria-hidden /> Pro
    </span>
  );
}

// What a free user sees on tapping a Pro feature: what they'd get and one
// button to Stripe Checkout. Not an error.
export function UpgradeSheet({
  open,
  onClose,
  feature,
  startAtPayment,
}: {
  open: boolean;
  onClose: () => void;
  feature?: "receipt" | "export" | "chat";
  // Straight to the form (the Pro page already showed what you get)
  startAtPayment?: boolean;
}) {
  const { t } = useI18n();
  const p = t.pro;
  const checkout = useCheckout();
  const [paying, setPaying] = useState(Boolean(startAtPayment));
  const perks = [
    { key: "chat", icon: ChatCircleDots, label: p.perks.chat },
    { key: "receipt", icon: Camera, label: p.perks.receipt },
    { key: "export", icon: DownloadSimple, label: p.perks.export },
    { key: "ai", icon: Lightning, label: p.perks.ai },
  ];
  const close = () => {
    onClose();
    setPaying(Boolean(startAtPayment));
  };
  return (
    <Sheet open={open} onClose={close} title={paying ? p.checkoutTitle : p.title} wide={paying}>
      {/* The form mounts only once it's shown: one Checkout Session per open */}
      {paying && open ? (
        <CheckoutPanel />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-3xl ai-surface">
              <AiMark size={34} />
            </span>
            <p className="text-[17px] leading-snug font-medium">{feature ? p.unlock[feature] : p.lead}</p>
          </div>
          <ul className="space-y-2">
            {perks.map(({ key, icon: Icon, label }) => (
              <li
                key={key}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px]",
                  key === feature ? "bg-accent-soft font-semibold" : "bg-surface-2",
                )}
              >
                <Icon size={20} className="shrink-0 text-accent" aria-hidden />
                <span className="flex-1">{label}</span>
                <Check size={16} weight="bold" className="text-income" aria-hidden />
              </li>
            ))}
          </ul>
          <Button
            size="lg"
            className="w-full"
            disabled={checkout.pending}
            onClick={() => (checkout.embedded ? setPaying(true) : checkout.redirect())}
          >
            <Crown size={18} weight="fill" /> {checkout.pending ? p.opening : p.upgrade}
          </Button>
          <Link href="/pro" onClick={close} className="block text-center text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline">
            {p.compare}
          </Link>
        </div>
      )}
    </Sheet>
  );
}

// A hook for gated buttons: run the feature on Pro, show the sheet on free
export function useProGate(feature: "receipt" | "export" | "chat") {
  const plan = usePlan();
  const [open, setOpen] = useState(false);
  return {
    plan,
    locked: plan === "free",
    // Calls `run` when allowed; otherwise opens the upgrade sheet
    guard: (run: () => void) => (plan === "free" ? setOpen(true) : run()),
    sheet: <UpgradeSheet open={open} onClose={() => setOpen(false)} feature={feature} />,
  };
}
