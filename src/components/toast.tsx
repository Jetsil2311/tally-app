"use client";

import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from "react";

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error";
  action?: { label: string; onClick: () => void };
}

type Notify = (message: string, options?: { tone?: Toast["tone"]; action?: Toast["action"] }) => void;

const ToastContext = createContext<Notify | null>(null);

// Brief confirmations ("Expense saved", with Undo). Announced politely to
// screen readers and never steal focus.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const reduce = useReducedMotion();

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const notify = useCallback<Notify>(
    (message, { tone = "success", action } = {}) => {
      const id = ++nextId.current;
      setToasts((list) => [...list.slice(-2), { id, message, tone, action }]);
      setTimeout(() => dismiss(id), action ? 6000 : 3500);
    },
    [dismiss],
  );

  const value = useMemo(() => notify, [notify]);

  return (
    <ToastContext value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-60 flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              // Pill for short messages; long ones wrap inside the screen
              className="glass pointer-events-auto flex min-h-12 max-w-md items-center gap-3 rounded-[24px] py-2 pr-2 pl-4 text-[15px] leading-snug"
            >
              {toast.tone === "success" ? (
                <CheckCircle weight="fill" size={20} className="shrink-0 text-income" />
              ) : (
                <WarningCircle weight="fill" size={20} className="shrink-0 text-expense" />
              )}
              <span className="pr-2">{toast.message}</span>
              {toast.action ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                  className="h-9 shrink-0 rounded-full bg-ink px-4 text-sm font-medium text-surface transition-opacity hover:opacity-85"
                >
                  {toast.action.label}
                </button>
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const notify = use(ToastContext);
  if (!notify) throw new Error("useToast must be used inside ToastProvider");
  return notify;
}
