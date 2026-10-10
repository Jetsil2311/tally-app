"use client";

import {
  ArrowUp,
  CaretDown,
  Check,
  ChatCircleDots,
  CheckCircle,
  ClockCounterClockwise,
  Copy,
  PiggyBank,
  Question,
  Repeat,
  TrendDown,
  TrendUp,
  WarningCircle,
  X,
  XCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { usePathname } from "next/navigation";
import { isValidElement, Suspense, use, useActionState, useEffect, useRef, useState, useTransition, type FormEvent, type KeyboardEvent, type ReactNode } from "react";

import { dismissInsight, generateInsights, markInsightsSeen, saveFinancialProfile } from "@/actions/ai";
import { useI18n } from "@/i18n/client";
import { currencySymbol } from "@/lib/money";
import type { Account, ActionState, AiStatus, ChatAnswer, FinancialProfile, Insight, Verdict } from "@/lib/types";

import { AskAiButton, useAi, type Turn } from "./ai-assist";
import { AiMark, AiTag } from "./ai-mark";
import { Money } from "./preferences";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, Card, cn, EmptyState, Field, Input, IconButton, SectionTitle, Select } from "./ui";
import { submitWith } from "./use-form-action";

// The assistant: "can I afford it?" chat on the left; insights, the
// financial plan and AI usage on the right. Every number shown comes from
// the API's code; the AI only words the answers.

export function Assistant({
  status,
  insights,
  profile,
  accounts,
}: {
  status: AiStatus | null;
  insights: Insight[];
  profile: FinancialProfile | null;
  accounts: Account[];
}) {
  const { t } = useI18n();
  return (
    <>
      <header className="rise flex items-center gap-3 pt-2">
        <span className="flex size-11 items-center justify-center rounded-2xl ai-surface">
          <AiMark size={24} />
        </span>
        <h1 className="text-[28px] font-semibold tracking-tight sm:text-[32px]">{t.ai.title}</h1>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <Chat accounts={accounts} />
        </div>
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-5">
          <InsightsFeed insights={insights} />
          <PlanCard profile={profile} />
          <StatusCard status={status} />
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

// The conversation lives in AiProvider: the same one shows on /assistant and
// in the sheet that any screen opens, so it carries across both.
function Chat({ accounts, inSheet }: { accounts: Account[]; inSheet?: boolean }) {
  const { t } = useI18n();
  const { turns, pending, draft, setDraft, accountId, setAccountId, ask, clear } = useAi();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest answer in view (not on load: that would scroll the
  // page past the header on phones)
  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns]);

  // A prefilled question: put the cursor at its end so it can be finished
  useEffect(() => {
    if (!inSheet || !draft) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(draft.length, draft.length);
    // Only when the sheet opens with a draft, not on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inSheet]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask(draft);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter is a new line
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      ask(draft);
    }
  };

  const writable = accounts.filter((a) => a.isActive);

  const body = (
    <>
      <div className={cn("flex-1 space-y-5", inSheet ? "px-6 pb-4" : "p-4 sm:p-6")} aria-live="polite">
        {turns.length === 0 ? (
          <div className={inSheet ? "py-2" : "py-4 sm:py-8"}>
            {inSheet ? null : (
              <p className="text-[22px] leading-tight font-semibold tracking-tight sm:text-2xl">{t.ai.heroTitle}</p>
            )}
            <p className={cn("max-w-[52ch] text-[15px] leading-relaxed text-ink-2", !inSheet && "mt-2")}>{t.ai.heroBody}</p>
            <div className="mt-5 flex flex-col items-start gap-2">
              {t.ai.prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => ask(prompt)}
                  className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-line bg-surface-2 px-4 text-left text-[15px] transition-[border-color,transform] duration-200 hover:border-line-strong active:scale-[0.98]"
                >
                  <ChatCircleDots size={18} className="shrink-0 text-ink-3" />
                  <span className="truncate">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          turns.map((turn) => <ChatTurn key={turn.id} turn={turn} />)
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className={cn("border-t border-line bg-surface", inSheet ? "sheet-composer sticky px-4 pt-3 sm:px-6" : "p-3 sm:p-4")}>
        <div className="flex items-end gap-2 rounded-3xl border border-line bg-surface-2 p-1.5 pl-4 transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
          <label htmlFor={inSheet ? "assistant-sheet-input" : "assistant-input"} className="sr-only">
            {t.ai.ask}
          </label>
          <textarea
            ref={inputRef}
            id={inSheet ? "assistant-sheet-input" : "assistant-input"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={1000}
            placeholder={t.ai.placeholder}
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-base text-ink placeholder:text-ink-3 focus:outline-none no-focus-ring"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            type="submit"
            disabled={!draft.trim() || pending}
            aria-label={t.ai.ask}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-[transform,opacity] hover:bg-accent-hover active:scale-95 disabled:opacity-40"
          >
            <ArrowUp size={20} weight="bold" />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
          {writable.length > 1 ? (
            <label className="flex items-center gap-2 text-xs text-ink-2">
              <span>{t.common.account}</span>
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="h-9 rounded-full py-0 text-sm">
                <option value="">{t.activity.allAccounts}</option>
                {writable.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </label>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-3">
            {t.ai.spanishNote ? <span className="text-xs text-ink-3">{t.ai.spanishNote}</span> : null}
            {turns.length ? (
              <button type="button" onClick={clear} className="text-xs text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                {t.ai.clear}
              </button>
            ) : null}
          </span>
        </div>
      </form>
    </>
  );

  if (inSheet) return body;
  return (
    <Card className="rise flex flex-col overflow-hidden p-0" style={{ "--i": 1 } as React.CSSProperties} aria-labelledby="chat-title">
      <h2 id="chat-title" className="sr-only">
        {t.ai.heroTitle}
      </h2>
      {body}
    </Card>
  );
}

// The assistant over whatever screen you're on. Mounted once in the app
// shell; AskAiButton, the top bar and Home open it.
export function AssistantSheet({ accounts: accountsPromise }: { accounts: Promise<Account[]> }) {
  const { t } = useI18n();
  const { isOpen, close } = useAi();
  const pathname = usePathname();
  return (
    <Sheet
      open={isOpen}
      onClose={close}
      wide
      title={t.ai.title}
      description={
        pathname === "/assistant" ? undefined : (
          <Link href="/assistant" onClick={close} className="underline-offset-4 hover:text-ink hover:underline">
            {t.ai.openFull}
          </Link>
        )
      }
    >
      <div className="-mx-6 flex min-h-[40dvh] flex-col">
        <Suspense fallback={<div className="skeleton mx-6 h-40 rounded-3xl" />}>
          <SheetChat accounts={accountsPromise} />
        </Suspense>
      </div>
    </Sheet>
  );
}

function SheetChat({ accounts }: { accounts: Promise<Account[]> }) {
  return <Chat accounts={use(accounts)} inSheet />;
}

function ChatTurn({ turn }: { turn: Turn }) {
  const { t } = useI18n();
  const { ask } = useAi();
  return (
    <div className="space-y-3">
      {/* The question, on the right like any chat */}
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-ink px-4 py-2.5 text-[15px] leading-relaxed text-surface">
          <span className="sr-only">{t.ai.you}: </span>
          {turn.question}
        </p>
      </div>
      <div className="flex items-start gap-2.5">
        <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full ai-surface">
          <AiMark size={16} />
        </span>
        {/* aria-busy: screen readers get the finished answer, not every word */}
        <div className="min-w-0 flex-1" aria-busy={turn.streaming || undefined}>
          {turn.answer ? (
            <AnswerCard answer={turn.answer} streaming={turn.streaming} onRetry={() => ask(turn.question)} />
          ) : turn.error ? (
            <p role="alert" className="rounded-3xl bg-expense-soft px-4 py-3 text-sm text-expense">
              {turn.error}
            </p>
          ) : (
            <p className="flex items-center gap-2 rounded-3xl bg-surface-2 px-4 py-3 text-sm text-ink-2">
              <span className="ai-thinking flex gap-1" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              {t.ai.thinking}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Status colours, always with an icon and words (never colour alone)
const VERDICT_STYLE: Record<Verdict, { icon: typeof CheckCircle; chip: string; fill: string }> = {
  comfortable: { icon: CheckCircle, chip: "bg-income-soft text-income", fill: "bg-income" },
  tight: { icon: WarningCircle, chip: "bg-warn-soft text-warn", fill: "bg-warn" },
  not_recommended: { icon: XCircle, chip: "bg-expense-soft text-expense", fill: "bg-expense" },
  insufficient_data: { icon: Question, chip: "bg-surface-2 text-ink-2", fill: "bg-ink-3" },
};

export function AnswerCard({ answer, streaming, onRetry }: { answer: ChatAnswer; streaming?: boolean; onRetry?: () => void }) {
  const { t } = useI18n();
  const a = answer.analysis ?? {};
  const currency = typeof a.currency === "string" ? a.currency : undefined;
  const price = typeof a.price === "string" ? Number(a.price) : null;
  const margin = typeof a.margin === "string" ? Number(a.margin) : null;
  const verdict = answer.verdict;
  const style = verdict ? VERDICT_STYLE[verdict] : null;

  // Every figure behind the answer, minus internal fields
  const figures = Object.entries(a).filter(
    ([key, value]) =>
      !["veredicto", "veredictoEnPalabras", "compra", "currency", "price", "margin", "original"].includes(key) &&
      value !== null &&
      value !== undefined &&
      value !== "",
  );
  const show = (value: unknown) =>
    typeof value === "boolean" ? (value ? t.ai.yes : t.ai.no) : Array.isArray(value) ? value.join(" · ") : String(value);

  // A general question: a conversational reply, shown like any chat message.
  // Its `analysis` is the data the AI was given, not a calculation to show.
  if (!verdict) {
    return (
      <article className="rounded-3xl rounded-tl-lg bg-surface-2 px-4 py-3 sm:px-5">
        <RichText text={answer.answer} streaming={streaming} />
        {!streaming && !answer.ai.used ? <Fallback reason={answer.ai.reason} onRetry={onRetry} /> : null}
        {!streaming ? <p className="mt-3 text-xs leading-relaxed text-ink-3">{answer.disclaimer}</p> : null}
      </article>
    );
  }

  return (
    <article className="ai-surface overflow-hidden rounded-3xl">
      {verdict && style ? (
        <div className="space-y-4 p-4 sm:p-5">
          <p className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold", style.chip)}>
            <style.icon size={16} weight="fill" aria-hidden />
            {t.ai.verdict[verdict].label}
          </p>
          {price !== null && currency ? (
            <>
              <dl className="grid grid-cols-3 gap-3 [&>div]:min-w-0">
                <div>
                  <dt className="text-xs text-ink-2">{t.ai.price}</dt>
                  <dd>
                    <Money value={price} currency={currency} className="block truncate text-lg font-semibold tracking-tight" />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-2">{t.ai.room}</dt>
                  <dd>
                    {margin !== null ? (
                      <Money value={margin} currency={currency} className="block truncate text-lg font-semibold tracking-tight" />
                    ) : (
                      <span className="text-lg text-ink-3">–</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-2">{margin !== null && margin - price < 0 ? t.ai.short : t.ai.leftAfter}</dt>
                  <dd>
                    {margin !== null ? (
                      <Money
                        value={Math.abs(margin - price)}
                        currency={currency}
                        className={cn("block truncate text-lg font-semibold tracking-tight", margin - price < 0 ? "text-expense" : "text-ink")}
                      />
                    ) : (
                      <span className="text-lg text-ink-3">–</span>
                    )}
                  </dd>
                </div>
              </dl>
              {margin !== null && margin > 0 ? <RoomMeter price={price} margin={margin} fill={style.fill} /> : null}
            </>
          ) : null}
          <p className="text-xs text-ink-2">{t.ai.verdict[verdict].hint}</p>
        </div>
      ) : null}

      <div className={cn("space-y-3 px-4 pb-4 sm:px-5", verdict ? "border-t border-line/70 pt-4" : "pt-4")}>
        <RichText text={answer.answer} streaming={streaming} />

        {figures.length && !streaming ? (
          <details className="group rounded-2xl bg-surface/70">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
              {t.ai.howWeGotThere}
              <CaretDown size={16} className="transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <dl className="divide-y divide-line px-3 pb-2">
              {figures.map(([key, value]) => (
                <div key={key} className="flex items-baseline justify-between gap-4 py-2 text-sm">
                  <dt className="text-ink-2">{t.ai.figures[key] ?? key}</dt>
                  <dd translate="no" className="tabular min-w-0 text-right font-medium">
                    {show(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        ) : null}

        {!streaming ? (
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {answer.ai.used ? <AiTag>{t.ai.wordedByAi}</AiTag> : <span className="text-xs text-ink-3">{t.ai.wordedByTally}</span>}
            </div>
            <p className="text-xs leading-relaxed text-ink-3">{answer.disclaimer}</p>
          </>
        ) : null}
      </div>
    </article>
  );
}

// Why this reply is Tally's template instead of the AI's, from the API's
// `ai.reason`, plus a retry where trying again can help
function Fallback({ reason, onRetry }: { reason: string | null; onRetry?: () => void }) {
  const { t } = useI18n();
  const why = reason ? (t.ai.fallbackReason[reason] ?? t.ai.fallbackReason.error) : t.ai.fallbackReason.error;
  const retryable = !reason || ["invalid_figures", "provider_limit", "error"].includes(reason);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-surface/70 px-3 py-2 text-xs text-ink-2">
      <span className="min-w-0 flex-1">
        {t.ai.wordedByTally}: {why}
      </span>
      {retryable && onRetry ? (
        <button type="button" onClick={onRetry} className="font-medium text-ink underline-offset-4 hover:underline">
          {t.ai.tryAgain}
        </button>
      ) : null}
    </div>
  );
}

// The AI answers in Markdown (GitHub flavour: lists, tables, code). Raw HTML
// in it is never rendered and unsafe links are dropped, so an answer can't
// inject markup. While streaming, a half-written block (an open ``` fence)
// just shows as what it is so far.
const MARKDOWN: Components = {
  p: ({ children }) => <p>{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  h1: ({ children }) => <h3 className="text-base font-semibold">{children}</h3>,
  h2: ({ children }) => <h3 className="text-base font-semibold">{children}</h3>,
  h3: ({ children }) => <h4 className="text-[15px] font-semibold">{children}</h4>,
  h4: ({ children }) => <h4 className="text-[15px] font-semibold">{children}</h4>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5 marker:text-ink-3">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5 marker:text-ink-3">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline underline-offset-4">
      {children}
    </a>
  ),
  blockquote: ({ children }) => <blockquote className="border-l-2 border-line-strong pl-3 text-ink-2">{children}</blockquote>,
  hr: () => <hr className="border-line" />,
  table: ({ children }) => (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-line px-2 py-1.5 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-line/60 px-2 py-1.5 align-top">{children}</td>,
  // Fenced blocks arrive as <pre><code class="language-x">: the block is
  // drawn by `pre`, so `code` only styles inline code
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  code: ({ className, children }) =>
    className?.startsWith("language-") ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[0.88em]">{children}</code>
    ),
};

function RichText({ text, streaming }: { text: string; streaming?: boolean }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed break-words">
      <Markdown remarkPlugins={[remarkGfm]} components={MARKDOWN}>
        {text}
      </Markdown>
      {streaming ? <span aria-hidden className="-mt-2 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[var(--ai-2)]" /> : null}
    </div>
  );
}

// A code block from an answer: monospace, scrolls sideways instead of
// wrapping, with its language and a copy button
function CodeBlock({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const code = isValidElement<{ className?: string }>(children) ? children : null;
  const language = code?.props.className?.replace("language-", "") ?? "";
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-bg" translate="no">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5 text-xs text-ink-3">
        <span className="font-mono">{language}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(ref.current?.innerText ?? "").then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="inline-flex min-h-7 items-center gap-1 rounded-full px-2 font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          {copied ? <Check size={13} weight="bold" aria-hidden /> : <Copy size={13} aria-hidden />}
          {copied ? t.ai.copied : t.ai.copy}
        </button>
      </div>
      <pre ref={ref} className="overflow-x-auto px-3 py-2.5 font-mono text-[13px] leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

// The price as a share of this month's room: a thin meter (dataviz: a
// single value against a capacity is a meter, not a chart). The tick marks
// half the room, where "comfortable" becomes "tight".
function RoomMeter({ price, margin, fill }: { price: number; margin: number; fill: string }) {
  const share = Math.min(price / margin, 1);
  return (
    <div aria-hidden className="relative h-2 rounded-full bg-surface-3">
      <span className={cn("absolute inset-y-0 left-0 rounded-full", fill)} style={{ width: `${Math.max(share * 100, 2)}%` }} />
      <span className="absolute -top-1 -bottom-1 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-ink-3" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insights and suggestions
// ---------------------------------------------------------------------------

const INSIGHT_ICONS: Record<string, typeof TrendUp> = {
  category_spike: TrendUp,
  category_rising: TrendUp,
  month_closed_negative: TrendDown,
  negative_month_projection: WarningCircle,
  subscription_review: Repeat,
  savings_progress: PiggyBank,
};

export function InsightsFeed({
  insights,
  compact,
  title,
  hint,
  extra,
  highlight,
}: {
  insights: Insight[];
  compact?: boolean;
  title?: string;
  hint?: string;
  // More actions next to "Check now", e.g. an Ask AI button
  extra?: React.ReactNode;
  // The AI's gradient frame and mark, where it sits among non-AI cards
  highlight?: boolean;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [checking, startCheck] = useTransition();
  // Which were new when the page opened: they keep the "New" label while
  // being marked as read in the background
  const [fresh] = useState(() => new Set(insights.filter((i) => !i.seenAt).map((i) => i.id)));

  useEffect(() => {
    if (!compact && fresh.size) void markInsightsSeen([...fresh]);
  }, [compact, fresh]);

  const check = () =>
    startCheck(async () => {
      const result = await generateInsights("weekly");
      toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
    });

  return (
    <Card
      className={cn("rise p-3 sm:p-4", highlight && "ai-surface")}
      style={{ "--i": 2 } as React.CSSProperties}
      aria-labelledby="insights-title"
    >
      <div className="px-3 pt-2">
        <SectionTitle
          id="insights-title"
          action={
            !compact ? (
              <span className="flex flex-wrap justify-end gap-2">
                {extra}
                <Button size="sm" variant="secondary" disabled={checking} onClick={check}>
                  <ClockCounterClockwise size={16} /> {checking ? t.ai.checking : t.ai.checkNow}
                </Button>
              </span>
            ) : null
          }
        >
          <span className="inline-flex items-center gap-2">
            {highlight ? <AiMark size={20} /> : null}
            {title ?? t.ai.insightsTitle}
          </span>
        </SectionTitle>
        {!compact ? <p className="-mt-2 mb-2 text-sm text-ink-2">{hint ?? t.ai.insightsHint}</p> : null}
      </div>
      {insights.length === 0 ? (
        <EmptyState icon={<AiMark size={24} />} title={t.ai.noInsights} className="py-6">
          {t.ai.noInsightsHint}
        </EmptyState>
      ) : (
        <ul className="space-y-1">
          {insights.map((insight) => (
            <InsightItem key={insight.id} insight={insight} isNew={fresh.has(insight.id)} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function InsightItem({ insight, isNew }: { insight: Insight; isNew: boolean }) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(false);
  const [, startTransition] = useTransition();
  const Icon = INSIGHT_ICONS[insight.type] ?? ChatCircleDots;
  const suggestion = insight.kind === "suggestion";
  if (hidden) return null;
  return (
    <li className="flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-surface-2">
      <span
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
          suggestion ? "bg-accent-soft text-accent" : "bg-surface-3 text-ink-2",
        )}
        aria-hidden
      >
        <Icon size={18} weight="bold" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-2">
          <span className="font-medium">{t.ai.kind[insight.kind]}</span>
          {isNew ? (
            <span className="inline-flex items-center gap-1 font-medium text-accent">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden /> {t.ai.newLabel}
            </span>
          ) : null}
          {insight.writtenBy === "ai" ? <AiTag /> : null}
        </p>
        <p className="mt-1 text-[15px] font-medium leading-snug">{insight.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">{insight.message}</p>
        <AskAiButton size="xs" className="mt-2.5" label={t.ai.askAboutThis} ask={t.ai.askAboutInsight(insight.title)} />
      </div>
      <IconButton
        label={t.ai.dismiss}
        className="-mt-1 -mr-2"
        onClick={() => {
          setHidden(true);
          startTransition(async () => {
            await dismissInsight(insight.id);
          });
        }}
      >
        <X size={16} />
      </IconButton>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Financial plan and AI status
// ---------------------------------------------------------------------------

function PlanCard({ profile }: { profile: FinancialProfile | null }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [rate, setRate] = useState(String(profile?.savingsRate ?? ""));
  const [income, setIncome] = useState(profile?.monthlyIncome ?? "");
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await saveFinancialProfile(prev, formData);
    if (result.ok) toast(result.message ?? t.common.saved);
    return result;
  }, {});
  if (!profile) return null;

  const currency = profile.currency;
  const base = Number(income || profile.estimatedMonthlyIncome || 0);
  const goal = Number(rate);
  const errors = state.fieldErrors ?? {};

  return (
    <Card className="rise p-6" style={{ "--i": 3 } as React.CSSProperties} aria-labelledby="plan-title">
      <SectionTitle id="plan-title">{t.ai.profileTitle}</SectionTitle>
      <p className="-mt-2 mb-4 text-sm text-ink-2">{t.ai.profileHint}</p>
      <form onSubmit={submitWith(formAction)} className="space-y-5" noValidate>
        <Field
          label={t.ai.income}
          htmlFor="plan-income"
          optional
          error={errors.monthlyIncome}
          hint={
            profile.estimatedMonthlyIncome
              ? t.ai.incomeHint(<Money value={profile.estimatedMonthlyIncome} currency={currency} className="font-medium text-ink" />)
              : t.ai.incomeNoEstimate
          }
        >
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-2" translate="no">
              {currencySymbol(currency, locale)}
            </span>
            <Input
              id="plan-income"
              name="monthlyIncome"
              inputMode="decimal"
              autoComplete="off"
              placeholder={profile.estimatedMonthlyIncome ?? "0.00"}
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="tabular pl-9"
              aria-invalid={Boolean(errors.monthlyIncome)}
            />
          </div>
        </Field>

        <Field
          label={`${t.ai.savingsRate} · ${goal || 0}%`}
          htmlFor="plan-rate"
          error={errors.savingsRate}
          hint={base > 0 && goal > 0 ? t.ai.savingsRateHint(<Money value={(base * goal) / 100} currency={currency} className="font-medium text-ink" />) : undefined}
        >
          <input
            id="plan-rate"
            name="savingsRate"
            type="range"
            min={0}
            max={90}
            step={1}
            value={rate || 0}
            onChange={(e) => setRate(e.target.value)}
            className="h-11 w-full accent-[var(--accent)]"
          />
        </Field>

        {state.message && !state.ok && !Object.keys(errors).length ? (
          <p role="alert" className="rounded-2xl bg-expense-soft px-4 py-3 text-sm text-expense">
            {state.message}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t.common.saving : t.ai.saveProfile}
        </Button>
      </form>
    </Card>
  );
}

function StatusCard({ status }: { status: AiStatus | null }) {
  const { t, locale } = useI18n();
  if (!status) return null;
  const share = status.limit ? Math.min(status.used / status.limit, 1) : 0;
  const resets = new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(status.resetsAt));
  return (
    <Card className="rise p-6" style={{ "--i": 4 } as React.CSSProperties} aria-labelledby="usage-title">
      <div className="flex items-center gap-2">
        <AiMark size={18} />
        <h2 id="usage-title" className="text-[17px] font-semibold tracking-tight">
          {t.ai.usageTitle}
        </h2>
      </div>
      {!status.enabled && status.reason ? (
        <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink-2">{t.ai.off[status.reason]}</p>
      ) : null}
      {status.reason !== "disabled" ? (
        <div className="mt-4">
          <p className="flex items-baseline justify-between gap-3 text-sm">
            <span className="tabular font-medium">{t.ai.usage(status.used, status.limit)}</span>
            <span className="text-ink-3">{t.ai.resets(resets)}</span>
          </p>
          {/* A single value against a capacity: a thin meter, with the
              numbers written out above (never colour alone) */}
          <div
            className="mt-2 h-2 rounded-full bg-surface-3"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={status.limit}
            aria-valuenow={status.used}
            aria-label={t.ai.usageTitle}
          >
            <span
              className={cn("block h-full rounded-full", share >= 1 ? "bg-expense" : share >= 0.8 ? "bg-warn" : "bg-accent")}
              style={{ width: `${Math.max(share * 100, status.used ? 2 : 0)}%` }}
            />
          </div>
        </div>
      ) : null}
      <p className="mt-4 text-xs leading-relaxed text-ink-3">{t.ai.privacy}</p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Home: ask about a purchase, and the newest insights
// ---------------------------------------------------------------------------

export function HomeAssistant({
  insights,
  suggestions,
  aiEnabled,
}: {
  insights: Insight[];
  // Questions worked out from this month's numbers (an upcoming bill, the
  // biggest category), asked in one tap
  suggestions: string[];
  aiEnabled: boolean;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const { open } = useAi();
  const [draft, setDraft] = useState("");
  const [checking, startCheck] = useTransition();
  const latest = insights.slice(0, 3);
  const unseen = insights.filter((insight) => !insight.seenAt).length;

  // Opens the assistant over Home with the question already asked
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question) return;
    open({ ask: question });
    setDraft("");
  };

  return (
    <section className="rise ai-surface rounded-3xl p-5 sm:p-6" style={{ "--i": 3 } as React.CSSProperties} aria-labelledby="home-ai-title">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h2 id="home-ai-title" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
              <AiMark size={20} /> {t.ai.homeTitle}
              {!aiEnabled ? <span className="text-xs font-normal text-ink-3">· {t.ai.templatesOnly}</span> : null}
            </h2>
            <Link href="/assistant" className="text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline">
              {t.ai.seeAll}
            </Link>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{t.ai.homeLead}</p>
          <form onSubmit={submit} className="mt-4 flex gap-2">
            <label htmlFor="home-ask" className="sr-only">
              {t.ai.ask}
            </label>
            <Input
              id="home-ask"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.ai.homeAsk}
              autoComplete="off"
              maxLength={1000}
              className="min-w-0 bg-surface"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label={t.ai.ask}
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-[transform,opacity] hover:bg-accent-hover active:scale-95 disabled:opacity-40"
            >
              <ArrowUp size={20} weight="bold" />
            </button>
          </form>
          {suggestions.length ? (
            <div className="mt-3">
              <p className="mb-2 text-xs font-medium text-ink-3">{t.ai.suggestedQuestions}</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((question) => (
                  <AskAiButton key={question} size="xs" label={question} ask={question} className="max-w-full" />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 lg:border-l lg:border-line/70 lg:pl-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">
              {t.ai.insightsTitle}
              {unseen ? <span className="ml-1.5 font-normal text-ink-3">· {t.ai.newInsightsDot(unseen)}</span> : null}
            </h3>
            <button
              type="button"
              disabled={checking}
              onClick={() =>
                startCheck(async () => {
                  const result = await generateInsights("weekly");
                  toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
                })
              }
              className="inline-flex items-center gap-1.5 text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
            >
              <ClockCounterClockwise size={15} aria-hidden /> {checking ? t.ai.checking : t.ai.checkNow}
            </button>
          </div>
          {latest.length ? (
            <ul className="space-y-3">
              {latest.map((insight) => {
                const Icon = INSIGHT_ICONS[insight.type] ?? ChatCircleDots;
                return (
                  <li key={insight.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink-2" aria-hidden>
                      <Icon size={16} weight="bold" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-[15px] font-medium leading-snug">
                        <span className="min-w-0">{insight.title}</span>
                        {!insight.seenAt ? <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-label={t.ai.newLabel} /> : null}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-ink-2">{insight.message}</p>
                      <button
                        type="button"
                        onClick={() => open({ ask: t.ai.askAboutInsight(insight.title) })}
                        className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-ink underline-offset-4 hover:underline"
                      >
                        <AiMark size={13} /> {t.ai.askAboutThis}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-2xl bg-surface/70 px-4 py-3 text-sm leading-relaxed text-ink-2">{t.ai.noInsightsHint}</p>
          )}
        </div>
      </div>
    </section>
  );
}
