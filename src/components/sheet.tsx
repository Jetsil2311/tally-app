"use client";

import { X } from "@phosphor-icons/react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { useI18n } from "@/i18n/client";

import { cn, IconButton } from "./ui";

// Content stays mounted while closed so the exit animation has something to
// show; give the content a `key` to reset its state between openings.
// Modal built on <dialog>: focus trap, Esc to close and an inert page come
// from the browser. Bottom sheet on phones, centered panel from 640px.
export function Sheet({
  open,
  onClose,
  title,
  description,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { t } = useI18n();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={cn("sheet", wide && "sheet-wide")}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> itself
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92dvh] flex-col">
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
          <header className="flex items-start justify-between gap-4 px-6 pt-4 pb-2 sm:pt-6">
            <div>
              <h2 id={titleId} className="text-xl font-semibold tracking-tight">
                {title}
              </h2>
              {description ? <p className="mt-1 text-sm text-ink-2">{description}</p> : null}
            </div>
            <IconButton label={t.common.close} onClick={onClose} className="-mt-1 -mr-2">
              <X size={20} />
            </IconButton>
          </header>
          <div className="overflow-x-hidden overflow-y-auto overscroll-contain px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
        </div>
    </dialog>
  );
}
