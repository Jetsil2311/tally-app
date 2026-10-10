"use client";

import { ArrowsClockwise, Check, PencilSimple } from "@phosphor-icons/react";
import { useState, useTransition } from "react";

import { categorizePending, confirmCategory } from "@/actions/ai";
import { useI18n } from "@/i18n/client";
import { categoryLabel } from "@/lib/insights";
import type { Transaction } from "@/lib/types";

import { AiMark } from "./ai-mark";
import { Money, useAccountCurrency, usePreferences } from "./preferences";
import { useQuickAdd } from "./quick-add";
import { useToast } from "./toast";
import { Button, Card, cn, SectionTitle } from "./ui";

// Entries the AI categorized without being sure ("review"), to confirm in
// one tap, and the ones still waiting for a category ("pending").
// Confirming teaches Tally the merchant for next time.
export function CategoryReview({
  review,
  pending,
  aiEnabled,
  limit,
}: {
  review: Transaction[];
  pending: Transaction[];
  // Retrying pending ones only helps when AI is on
  aiEnabled: boolean;
  limit?: number;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [done, setDone] = useState<Set<string>>(new Set());
  const [retrying, startRetry] = useTransition();
  const open = review.filter((tx) => !done.has(tx.id) && tx.category);
  if (open.length === 0 && pending.length === 0) return null;
  const shown = limit ? open.slice(0, limit) : open;

  return (
    <Card className="rise ai-surface p-3 sm:p-4" aria-labelledby="review-title">
      <div className="flex items-start gap-3 px-3 pt-2">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-surface">
          <AiMark size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <SectionTitle id="review-title">
            {t.ai.toReviewTitle}
            {open.length ? <span className="tabular text-ink-3"> · {open.length}</span> : null}
          </SectionTitle>
          <p className="-mt-3 mb-2 text-sm leading-relaxed text-ink-2">{t.ai.toReviewHint}</p>
        </div>
      </div>

      {shown.length ? (
        <ul>
          {shown.map((tx) => (
            <ReviewRow key={tx.id} tx={tx} onDone={() => setDone((set) => new Set(set).add(tx.id))} />
          ))}
        </ul>
      ) : null}

      {pending.length ? (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface/70 px-3 py-3">
          <p className="text-sm text-ink-2">{t.ai.pendingCount(pending.length)}</p>
          {aiEnabled ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={retrying}
              onClick={() =>
                startRetry(async () => {
                  const result = await categorizePending();
                  toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
                })
              }
            >
              <ArrowsClockwise size={16} /> {retrying ? t.common.saving : t.ai.categorizeNow}
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function ReviewRow({ tx, onDone }: { tx: Transaction; onDone: () => void }) {
  const { t, locale } = useI18n();
  const { timeZone } = usePreferences();
  const { open } = useQuickAdd();
  const toast = useToast();
  const currency = useAccountCurrency(tx.accountId);
  const [pending, startTransition] = useTransition();
  const income = tx.type === "income";
  const when = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone }).format(new Date(tx.date));
  const suggestion = tx.category ? categoryLabel(tx.category.name, t) : "";

  return (
    <li className={cn("flex flex-col gap-2 rounded-2xl px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3", pending && "opacity-60")}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{tx.merchant || tx.description}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-sm text-ink-2">
            <AiMark size={12} />
            <span className="truncate">
              {t.ai.suggested(suggestion)} · {when}
            </span>
          </span>
        </span>
        <Money
          value={income ? tx.amount : -Number(tx.amount)}
          currency={currency}
          sign
          className={cn("shrink-0 text-[15px] font-semibold", income ? "text-income" : "text-ink")}
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 sm:flex-none"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await confirmCategory(tx.id);
              toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
              if (result.ok) onDone();
            })
          }
        >
          <Check size={16} weight="bold" /> {t.ai.confirm}
        </Button>
        <Button size="sm" variant="secondary" className="flex-1 sm:flex-none" disabled={pending} onClick={() => open({ transaction: tx })}>
          <PencilSimple size={16} /> {t.ai.change}
        </Button>
      </div>
    </li>
  );
}
