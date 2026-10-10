"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";

import { useI18n } from "@/i18n/client";
import type { ChatAnswer } from "@/lib/types";

import { AiMark } from "./ai-mark";
import { cn } from "./ui";

// The assistant, from anywhere: one conversation for the whole app, shown in
// a sheet over the current screen (and on /assistant). Any screen can open
// it with a question already asked, or prefilled for the user to finish, so
// asking never means leaving what you were doing.

// `streaming`: the answer is still arriving word by word
export type Turn = { id: number; question: string; answer?: ChatAnswer; error?: string; streaming?: boolean };

// The reply's language: the app's, with the browser's region when it matches
// ("es" + "es-MX" → "es-MX"), so answers sound local
function replyLocale(locale: string) {
  try {
    const browser = navigator.language;
    if (browser.toLowerCase().startsWith(locale.toLowerCase())) return browser;
  } catch {}
  return locale;
}

// Reads the API's Server-Sent Events: `meta` (everything but the text),
// then `delta`s with the text, then `done` (or `error`)
type StreamEvent = { event: string; data: Record<string, unknown> | null };

async function* readEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let end: number;
    while ((end = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let event = "message";
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      yield { event, data: data ? JSON.parse(data) : null };
    }
  }
}

interface AiContext {
  turns: Turn[];
  pending: boolean;
  draft: string;
  setDraft: (text: string) => void;
  // "" = all accounts
  accountId: string;
  setAccountId: (id: string) => void;
  isOpen: boolean;
  // Opens the sheet. `ask` sends a question right away; `draft` prefills
  // the box for the user to finish; `accountId` scopes the answer.
  open: (options?: { ask?: string; draft?: string; accountId?: string }) => void;
  close: () => void;
  ask: (question: string) => void;
  clear: () => void;
}

const Context = createContext<AiContext | null>(null);

export function AiProvider({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [accountId, setAccountId] = useState("");
  const [isOpen, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const nextId = useRef(0);

  const turnsRef = useRef<Turn[]>([]);
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);
  const patch = (id: number, change: Partial<Turn>) =>
    setTurns((list) => list.map((turn) => (turn.id === id ? { ...turn, ...change } : turn)));

  const send = useCallback(
    (question: string, scope: string) => {
      const text = question.trim();
      if (!text) return;
      // Earlier turns, so follow-ups ("and last month?") have context
      const history = turnsRef.current.flatMap((turn) =>
        turn.answer && !turn.streaming
          ? [
              { role: "user" as const, content: turn.question },
              { role: "assistant" as const, content: turn.answer.answer },
            ]
          : [],
      );
      const id = ++nextId.current;
      setTurns((list) => [...list, { id, question: text }]);
      setDraft("");
      startTransition(async () => {
        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, accountId: scope || undefined, history, locale: replyLocale(locale) }),
          });
          if (response.status === 401) {
            router.push("/auth/expired");
            return;
          }
          const type = response.headers.get("content-type") ?? "";
          if (!response.ok || !response.body) {
            const payload = await response.json().catch(() => null);
            patch(id, { error: payload?.message ?? t.ai.chatError });
            return;
          }
          // An API that doesn't stream: the whole answer at once
          if (!type.includes("text/event-stream")) {
            patch(id, { answer: (await response.json()) as ChatAnswer });
            return;
          }
          let answer = null as ChatAnswer | null;
          for await (const { event, data } of readEvents(response.body)) {
            if (event === "meta") {
              answer = { ...(data as unknown as Omit<ChatAnswer, "answer">), answer: "" };
              patch(id, { answer, streaming: true });
            } else if (event === "delta" && answer) {
              answer = { ...answer, answer: answer.answer + String(data?.text ?? "") };
              patch(id, { answer });
            } else if (event === "error") {
              patch(id, { streaming: false, error: answer?.answer ? undefined : String(data?.message ?? t.ai.chatError) });
              return;
            }
          }
          patch(id, { streaming: false, ...(answer ? {} : { error: t.ai.chatError }) });
        } catch {
          patch(id, { streaming: false, error: t.ai.chatError });
        }
      });
    },
    [t, locale, router],
  );

  const value = useMemo<AiContext>(
    () => ({
      turns,
      pending,
      draft,
      setDraft,
      accountId,
      setAccountId,
      isOpen,
      open: (options) => {
        const scope = options?.accountId ?? accountId;
        if (options?.accountId !== undefined) setAccountId(options.accountId);
        if (options?.draft !== undefined) setDraft(options.draft);
        setOpen(true);
        if (options?.ask) send(options.ask, scope);
      },
      close: () => setOpen(false),
      ask: (question) => {
        if (!pending) send(question, accountId);
      },
      clear: () => {
        setTurns([]);
        setDraft("");
      },
    }),
    [turns, pending, draft, accountId, isOpen, send],
  );

  return <Context value={value}>{children}</Context>;
}

export function useAi() {
  const value = use(Context);
  if (!value) throw new Error("useAi must be used inside AiProvider");
  return value;
}

// The small, always-recognisable way into the assistant: the AI mark plus a
// short label. Placed next to whatever it's about (a price, an account, a
// month), so the AI shows up where the question comes up.
export function AskAiButton({
  label,
  ask,
  draft,
  accountId,
  size = "sm",
  className,
}: {
  label?: string;
  // Asked as soon as the sheet opens
  ask?: string;
  // Or prefilled for the user to finish
  draft?: string;
  accountId?: string;
  size?: "xs" | "sm" | "icon";
  className?: string;
}) {
  const { t } = useI18n();
  const { open } = useAi();
  const text = label ?? t.ai.askAi;
  return (
    <button
      type="button"
      onClick={() => open({ ask, draft, accountId })}
      aria-label={size === "icon" ? text : undefined}
      title={size === "icon" ? text : undefined}
      className={cn(
        "ai-chip inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-medium transition-[transform,box-shadow] duration-200 active:scale-[0.97]",
        size === "icon" && "size-10",
        size === "sm" && "min-h-10 px-3.5 text-sm",
        size === "xs" && "min-h-8 px-2.5 text-xs",
        className,
      )}
    >
      <AiMark size={size === "xs" ? 14 : 17} />
      {size === "icon" ? null : <span className="truncate">{text}</span>}
    </button>
  );
}
