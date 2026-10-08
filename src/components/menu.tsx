"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { cn } from "./ui";

// Small dropdown: a trigger plus a panel that closes on outside click,
// Esc, or after an item is chosen.
export function Menu({
  trigger,
  label,
  children,
  align = "end",
  panelClassName,
}: {
  trigger: (props: { open: boolean }) => ReactNode;
  label: string;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="rounded-full"
      >
        {trigger({ open })}
      </button>
      {open ? (
        <div
          id={id}
          className={cn(
            "menu-panel absolute top-[calc(100%+8px)] z-50 min-w-56",
            align === "end" ? "right-0" : "left-0 origin-top-left",
            panelClassName,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({
  children,
  icon,
  onClick,
  active,
  className,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-[15px] text-ink transition-colors hover:bg-surface-2",
        active && "bg-surface-2 font-medium",
        className,
      )}
    >
      {icon ? <span className="text-ink-2">{icon}</span> : null}
      <span className="flex-1">{children}</span>
    </button>
  );
}
