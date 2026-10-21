"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

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
