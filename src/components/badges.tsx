"use client";

import {
  ArrowRight,
  Bank,
  Cards,
  ChatCircleDots,
  Compass,
  Confetti,
  CurrencyCircleDollar,
  FolderSimple,
  GlobeHemisphereWest,
  Handshake,
  Lock,
  MagicWand,
  Medal,
  PencilSimpleLine,
  PiggyBank,
  Plant,
  Repeat,
  SealCheck,
  ShieldCheck,
  Tag,
  Target,
  TrendUp,
  Trophy,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { use, useEffect, useId, useRef, useState } from "react";

import { useI18n } from "@/i18n/client";
import type { Badge, BadgeCategory } from "@/lib/types";

import { useViewer } from "./people-ui";
import { usePreferences } from "./preferences";
import { Card, cn } from "./ui";

// Badges: small milestones, one per feature. Cosmetic only (nothing is
// unlocked by them). The API sends an emoji per badge; the dashboard draws
// its own icon so they match the rest of the app on every device.

const ICONS: Record<string, Icon> = {
  beginner: Plant,
  profile_complete: Compass,
  first_account: Bank,
  first_transaction: PencilSimpleLine,
  first_category: FolderSimple,
  multi_account: Cards,
  foreign_account: GlobeHemisphereWest,
  world_traveler: CurrencyCircleDollar,
  ten_transactions: TrendUp,
  fifty_transactions: Trophy,
  categorizer_10: Tag,
  first_recurring: Repeat,
  verifier: SealCheck,
  connected: Handshake,
  team_player: UsersThree,
  guardian: ShieldCheck,
  ai_curious: ChatCircleDots,
  ai_doer: MagicWand,
  first_goal: Target,
  first_deposit: PiggyBank,
  goal_achieved: Confetti,
};

// One tint per category, from the app's own tokens; the AI's uses its
// gradient like every other AI touch
const TINT: Record<BadgeCategory, string> = {
  onboarding: "bg-accent-soft text-accent",
  accounts: "bg-accent-soft text-accent",
  transactions: "bg-income-soft text-income",
  recurring: "bg-warn-soft text-warn",
  social: "bg-accent-soft text-accent",
  ai: "ai-chip",
  goals: "bg-income-soft text-income",
};

const ORDER: BadgeCategory[] = ["onboarding", "accounts", "transactions", "recurring", "goals", "social", "ai"];

// The name and how-to-earn line in the user's language, by key; the API's
// Spanish text for a badge this dashboard doesn't know yet
function useBadgeText() {
  const { t } = useI18n();
  return (badge: Badge) => t.badges.catalog[badge.key] ?? { name: badge.name, hint: badge.description };
}

export function BadgeMedal({ badge, size = "md" }: { badge: Badge; size?: "sm" | "md" | "lg" | "xl" }) {
  const Glyph = ICONS[badge.key] ?? Medal;
  const dims = size === "xl" ? "size-28" : size === "lg" ? "size-16" : size === "sm" ? "size-9" : "size-14";
  const glyph = size === "xl" ? 56 : size === "lg" ? 30 : size === "sm" ? 17 : 26;
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full",
        dims,
        badge.earned ? TINT[badge.category] : "bg-surface-2 text-ink-3",
      )}
    >
      {badge.category === "ai" && badge.earned ? (
        <Glyph size={glyph} weight="duotone" className="text-[var(--ai-2)]" />
      ) : (
        <Glyph size={glyph} weight={badge.earned ? "duotone" : "regular"} />
      )}
      {!badge.earned ? (
        <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-surface ring-2 ring-surface">
          <Lock size={11} weight="bold" className="text-ink-3" />
        </span>
      ) : null}
    </span>
  );
}

export function BadgeCase({ badges }: { badges: Badge[] }) {
  const { t, locale } = useI18n();
  const { timeZone } = usePreferences();
  const text = useBadgeText();
  const earned = badges.filter((b) => b.earned);
  const share = badges.length ? earned.length / badges.length : 0;
  const latest = [...earned].sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""))[0];
  const when = (iso: string) => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone }).format(new Date(iso));

  return (
    <>
      <header className="rise pt-2">
        <h1 className="text-[32px] leading-[1.05] font-semibold sm:text-[40px]">{t.badges.title}</h1>
        <p className="mt-1 max-w-[56ch] text-sm leading-relaxed text-ink-2">{t.badges.intro}</p>
      </header>

      {/* How far along: count, meter, and the latest one earned */}
      <Card className="rise grid grid-cols-1 gap-5 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="min-w-0">
          <p className="text-sm text-ink-2">{t.badges.collected}</p>
          <p className="tabular font-display mt-1 text-[44px] leading-none font-semibold tracking-[-0.04em]">
            {earned.length}
            <span className="text-2xl font-medium text-ink-3"> / {badges.length}</span>
          </p>
          <div
            role="progressbar"
            aria-label={t.badges.collected}
            aria-valuemin={0}
            aria-valuemax={badges.length}
            aria-valuenow={earned.length}
            className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-3"
          >
            <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(share * 100, earned.length ? 3 : 0)}%` }} />
          </div>
        </div>
        {latest ? (
          <div className="flex items-center gap-3 rounded-3xl bg-surface-2 p-3 pr-5 sm:max-w-xs">
            <BadgeMedal badge={latest} />
            <div className="min-w-0">
              <p className="text-xs text-ink-2">{t.badges.latest}</p>
              <p className="truncate text-[15px] font-semibold">{text(latest).name}</p>
              {latest.earnedAt ? <p className="text-xs text-ink-3">{when(latest.earnedAt)}</p> : null}
            </div>
          </div>
        ) : null}
      </Card>

      {ORDER.map((category) => {
        const group = badges.filter((b) => b.category === category);
        if (!group.length) return null;
        const got = group.filter((b) => b.earned).length;
        return (
          <section key={category} aria-labelledby={`badges-${category}`} className="space-y-3">
            <h2 id={`badges-${category}`} className="flex items-baseline gap-2 text-[17px] font-semibold tracking-tight">
              {t.badges.categories[category]}
              <span className="tabular text-sm font-normal text-ink-3">
                {got}/{group.length}
              </span>
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((badge) => {
                const { name, hint } = text(badge);
                return (
                  <li
                    key={badge.key}
                    className={cn(
                      "flex items-center gap-4 rounded-3xl border p-4",
                      badge.earned ? "border-line bg-surface" : "border-dashed border-line bg-transparent",
                    )}
                  >
                    <BadgeMedal badge={badge} />
                    <div className="min-w-0">
                      <p className={cn("text-[15px] font-semibold", !badge.earned && "text-ink-2")}>
                        {name}
                        <span className="sr-only"> · {badge.earned ? t.badges.earned : t.badges.locked}</span>
                      </p>
                      <p className="mt-0.5 text-sm leading-snug text-ink-2">{hint}</p>
                      {badge.earned && badge.earnedAt ? (
                        <p className="mt-1 text-xs text-ink-3">{t.badges.earnedOn(when(badge.earnedAt))}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}

// Home: progress and the latest few, linking to the full case
export function BadgesGlance({ badges }: { badges: Badge[] }) {
  const { t } = useI18n();
  const text = useBadgeText();
  const earned = badges
    .filter((b) => b.earned)
    .sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""));
  const next = badges.find((b) => !b.earned);
  return (
    <Card className="rise flex flex-col p-6" style={{ "--i": 5 } as React.CSSProperties} aria-labelledby="badges-glance">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="badges-glance" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
          <Medal size={20} className="text-accent" aria-hidden /> {t.badges.title}
        </h2>
        <Link
          href="/achievements"
          aria-label={t.common.seeAll}
          title={t.common.seeAll}
          className="-mr-2 flex size-10 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ArrowRight size={18} />
        </Link>
      </div>
      {/* Collected so far: a bar and n/total */}
      <div className="flex items-center gap-3" title={t.badges.countOf(earned.length, badges.length)}>
        <div
          role="progressbar"
          aria-label={t.badges.collected}
          aria-valuemin={0}
          aria-valuemax={badges.length}
          aria-valuenow={earned.length}
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-3"
        >
          <span
            className="block h-full rounded-full bg-accent"
            style={{ width: `${badges.length ? Math.max((earned.length / badges.length) * 100, earned.length ? 3 : 0) : 0}%` }}
          />
        </div>
        <span className="tabular shrink-0 text-sm font-semibold">
          {earned.length}
          <span className="font-normal text-ink-3">/{badges.length}</span>
        </span>
      </div>
      {earned.length ? (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label={t.badges.latest}>
          {earned.slice(0, 8).map((badge) => (
            <li key={badge.key} title={text(badge).name}>
              <BadgeMedal badge={badge} size="sm" />
              <span className="sr-only">{text(badge).name}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {/* The next one to get: its medal, locked, and what to do */}
      {next ? (
        <div className="mt-auto pt-4">
          <Link href="/achievements" className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3 transition-colors hover:bg-surface-3">
            <BadgeMedal badge={next} size="sm" />
            <span className="min-w-0 truncate text-sm">{text(next).hint}</span>
          </Link>
        </div>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// The celebration: a new badge pops up in the middle of the screen
// ---------------------------------------------------------------------------

// Mounted once in the app shell with a fresh badges list after every change
// (each Server Action refreshes the shell). Anything earned since this
// browser last looked is celebrated, one at a time. On the first visit,
// only badges earned in the last few minutes pop up (a new user's first
// ones); older ones are remembered quietly.
const RECENT_MS = 15 * 60 * 1000;

export function BadgeCelebrator({ badges: badgesPromise }: { badges: Promise<Badge[]> }) {
  const badges = use(badgesPromise);
  const viewer = useViewer();
  const [queue, setQueue] = useState<Badge[]>([]);
  const [total, setTotal] = useState(0);
  const key = `tally:badges-seen:${viewer.id}`;

  useEffect(() => {
    const earned = badges.filter((b) => b.earned);
    if (!earned.length) return;
    let seen: string[] | null = null;
    try {
      seen = JSON.parse(localStorage.getItem(key) ?? "null");
    } catch {}
    const now = Date.now();
    const fresh = Array.isArray(seen)
      ? earned.filter((b) => !seen!.includes(b.key))
      : earned.filter((b) => b.earnedAt && now - new Date(b.earnedAt).getTime() < RECENT_MS);
    try {
      localStorage.setItem(key, JSON.stringify(earned.map((b) => b.key)));
    } catch {}
    if (!fresh.length) return;
    // Oldest first, so they arrive in the order they were earned
    fresh.sort((a, b) => (a.earnedAt ?? "").localeCompare(b.earnedAt ?? ""));
    // What was seen lives in localStorage, readable only after mount: the
    // effect is where the comparison has to happen
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQueue((current) => [...current, ...fresh.filter((b) => !current.some((c) => c.key === b.key))]);
    setTotal((n) => n + fresh.length);
  }, [badges, key]);

  const current = queue[0];
  const shown = total - queue.length + 1;
  const next = () =>
    setQueue((list) => {
      const rest = list.slice(1);
      if (!rest.length) setTotal(0);
      return rest;
    });

  return current ? <Celebration key={current.key} badge={current} position={total > 1 ? `${shown} / ${total}` : null} onClose={next} /> : null;
}

const CONFETTI_COLORS = ["var(--ai-1)", "var(--ai-2)", "var(--ai-3)", "var(--income)", "var(--accent)"];

function Celebration({ badge, position, onClose }: { badge: Badge; position: string | null; onClose: () => void }) {
  const { t } = useI18n();
  const text = useBadgeText();
  const ref = useRef<HTMLDialogElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  // Fixed per badge (not random on every render): angle, distance, color
  const [pieces] = useState(() =>
    Array.from({ length: 22 }, (_, i) => ({
      angle: (360 / 22) * i + ((i * 37) % 15),
      distance: 90 + ((i * 53) % 70),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + (i % 3) * 2,
      round: i % 2 === 0,
    })),
  );

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    // Opening a dialog focuses its first control; the main one is "Nice!"
    okRef.current?.focus({ focusVisible: false } as FocusOptions);
    // A tiny buzz on phones that support it: the "you got something" feeling
    try {
      navigator.vibrate?.([14, 50, 22]);
    } catch {}
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="badge-celebration m-auto w-[min(22rem,calc(100vw-2rem))] overflow-visible rounded-[2rem] border-0 bg-transparent p-0 text-ink backdrop:bg-black/55 backdrop:backdrop-blur-sm"
    >
      <div className="ai-surface relative flex flex-col items-center rounded-[2rem] px-6 pt-10 pb-6 text-center">
        {/* The burst behind the medal */}
        <div aria-hidden className="pointer-events-none absolute top-[4.5rem] left-1/2 size-0">
          <span className="badge-glow absolute -top-20 -left-20 size-40 rounded-full" />
          {pieces.map((piece, i) => (
            <span
              key={i}
              className="badge-confetti absolute"
              style={
                {
                  "--angle": `${piece.angle}deg`,
                  "--distance": `${piece.distance}px`,
                  "--delay": `${(i % 6) * 25}ms`,
                  width: piece.size,
                  height: piece.round ? piece.size : piece.size * 1.8,
                  borderRadius: piece.round ? "999px" : "2px",
                  background: piece.color,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <div className="badge-pop relative">
          <BadgeMedal badge={badge} size="xl" />
        </div>

        <p className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-ink-2">
          <Medal size={16} weight="fill" className="text-accent" aria-hidden />
          {t.badges.newBadge}
          {position ? <span className="tabular font-normal text-ink-3">· {position}</span> : null}
        </p>
        <h2 id={titleId} className="mt-1.5 text-[28px] leading-tight font-semibold tracking-tight">
          {text(badge).name}
        </h2>

        <div className="mt-7 grid w-full grid-cols-2 gap-2">
          <Link
            href="/achievements"
            onClick={onClose}
            className="flex min-h-12 items-center justify-center rounded-full border border-line bg-surface px-4 text-[15px] font-medium transition-colors hover:border-line-strong"
          >
            {t.badges.title}
          </Link>
          <button
            ref={okRef}
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-ink transition-[transform,translate,scale,rotate,background-color] hover:bg-accent-hover active:scale-[0.98]"
          >
            {t.badges.great}
          </button>
        </div>
      </div>
    </dialog>
  );
}
