"use client";

import { createContext, use, useCallback, useMemo, useRef, useState, useTransition, type ReactNode } from "react";

import { askAssistant } from "@/actions/ai";
import { useI18n } from "@/i18n/client";
import type { ChatAnswer } from "@/lib/types";

import { AiMark } from "./ai-mark";
import { cn } from "./ui";

// The assistant, from anywhere: one conversation for the whole app, shown in
// a sheet over the current screen (and on /assistant). Any screen can open
// it with a question already asked, or prefilled for the user to finish, so
// asking never means leaving what you were doing.

export type Turn = { id: number; question: string; answer?: ChatAnswer; error?: string };

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
  const { t } = useI18n();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [accountId, setAccountId] = useState("");
  const [isOpen, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const nextId = useRef(0);

  const send = useCallback(
    (question: string, scope: string) => {
      const text = question.trim();
      if (!text) return;
      const id = ++nextId.current;
      setTurns((list) => [...list, { id, question: text }]);
      setDraft("");
      startTransition(async () => {
        const result = await askAssistant(text, scope || undefined);
        setTurns((list) =>
          list.map((turn) =>
            turn.id === id ? { ...turn, answer: result.answer, error: result.answer ? undefined : (result.error ?? t.ai.chatError) } : turn,
          ),
        );
      });
    },
    [t],
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
