"use client";

import { useEffect, useState } from "react";

import { languageOf } from "@/i18n/config";
import { dictionaries, type Dictionary } from "@/i18n/dictionaries";

import { AiMark } from "./ai-mark";

// While a screen loads, Buck says what's being done, one short step after
// another, over a bar that keeps moving. A wait you can see progressing
// feels shorter than a still wireframe. Only shows up when loading takes a
// moment (fast loads never flash it), and is honest when it's slow.
//
// The skeleton under it is swapped as data streams in (shell, then page),
// so the pill keeps its place in the sequence across those swaps instead of
// starting over.

export type LoadingTopic = Exclude<keyof Dictionary["loadingSteps"], "almost" | "slow">;

// Seconds at which each named step appears; then "almost", then "slow"
const STEP_AT = [0, 1.4, 3.2];
const ALMOST_AT = 5.5;
const SLOW_AT = 10;
// Before this, nothing shows: most loads are done by then
const APPEAR_AFTER_MS = 350;

// One loading sequence across remounts: a status shown again within half a
// second continues where the previous one was
const session = { start: 0, lastSeen: 0 };

function stepFor(steps: readonly string[], almost: string, slow: string, elapsed: number) {
  if (elapsed >= SLOW_AT) return slow;
  if (elapsed >= ALMOST_AT) return almost;
  let text = steps[0];
  steps.forEach((step, i) => {
    if (elapsed >= (STEP_AT[i] ?? Infinity)) text = step;
  });
  return text;
}

export function LoadingStatus({ topic }: { topic: LoadingTopic }) {
  // Rendered only after mounting: the language comes from <html lang>
  // (set before first paint), so this also works outside the I18nProvider
  const [state, setState] = useState<{ t: Dictionary; start: number; continued: boolean; offset: number } | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const at = Date.now();
    const continued = at - session.lastSeen < 500 && session.start > 0;
    if (!continued) session.start = at;
    // Mount-time setup: the language lives in the DOM, not in React state
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({
      t: dictionaries[languageOf(document.documentElement.lang)],
      start: session.start,
      continued,
      offset: (at - session.start) / 1000,
    });
    setNow(at);
    const timer = setInterval(() => setNow(Date.now()), 400);
    return () => {
      clearInterval(timer);
      session.lastSeen = Date.now();
    };
  }, []);

  if (!state) return null;
  const { loadingSteps: l } = state.t;
  const elapsed = Math.max(0, (now - state.start) / 1000);
  const text = stepFor(l[topic], l.almost, l.slow, elapsed);

  return (
    <div
      aria-hidden
      className="loading-status pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.25rem)] z-35 flex justify-center px-4 lg:left-60"
      style={
        {
          // A continued sequence is already on screen: no fade-in delay, and
          // the bar picks up where it was
          "--appear-delay": state.continued ? "0ms" : `${APPEAR_AFTER_MS}ms`,
          "--elapsed": `-${state.offset}s`,
        } as React.CSSProperties
      }
    >
      <div className="glass loading-pill relative flex max-w-full items-center gap-2.5 overflow-hidden rounded-full py-2 pr-4 pl-2.5 text-sm font-medium text-ink">
        <span className="loading-buck flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--ai-soft)]">
          <AiMark size={18} />
        </span>
        {/* Keyed by text: each new step slides in */}
        <span key={text} className="loading-step truncate">
          {text}
        </span>
        <span className="absolute inset-x-3 bottom-0 h-[2px] overflow-hidden rounded-full bg-line/60">
          <span className="loading-progress block h-full origin-left rounded-full bg-[linear-gradient(90deg,var(--ai-1),var(--ai-2)_60%,var(--ai-3))]" />
        </span>
      </div>
    </div>
  );
}
