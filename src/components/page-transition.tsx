"use client";

import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Moving between screens: the old one fades back, the new one rises into
// focus (styles: ".page" in globals.css). Keyed by path, so only real
// navigation animates: filters (search params) and refreshes after an edit
// update in place.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="page" exit="page" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}

// Inside a <Link>: while that tap waits on the server, a thin bar runs
// across the top of the screen, so the tap visibly did something. Prefetched
// screens open at once and never show it.
export function PendingBar() {
  const { pending } = useLinkStatus();
  // Portaled: links often sit inside blurred or moving containers (dock,
  // sidebar, cards), which would trap a fixed bar inside them
  return pending ? createPortal(<span aria-hidden className="nav-pending" />, document.body) : null;
}
