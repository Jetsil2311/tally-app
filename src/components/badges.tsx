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
import { useEffect } from "react";

import { useI18n } from "@/i18n/client";
import type { Badge, BadgeCategory } from "@/lib/types";

import { usePreferences } from "./preferences";
import { useToast } from "./toast";
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

export function BadgeMedal({ badge, size = "md" }: { badge: Badge; size?: "sm" | "md" | "lg" }) {
  const Glyph = ICONS[badge.key] ?? Medal;
  const dims = size === "lg" ? "size-16" : size === "sm" ? "size-9" : "size-14";
  const glyph = size === "lg" ? 30 : size === "sm" ? 17 : 26;
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
      <BadgeWatcher badges={badges} />
      <header className="rise pt-2">
        <h1 className="text-[28px] font-semibold tracking-tight sm:text-[32px]">{t.badges.title}</h1>
        <p className="mt-1 max-w-[56ch] text-sm leading-relaxed text-ink-2">{t.badges.intro}</p>
      </header>

      {/* How far along: count, meter, and the latest one earned */}
      <Card className="rise grid grid-cols-1 gap-5 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" style={{ "--i": 1 } as React.CSSProperties}>
        <div className="min-w-0">
          <p className="text-sm text-ink-2">{t.badges.collected}</p>
          <p className="tabular mt-1 text-[40px] leading-none font-semibold tracking-tight">
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
      <BadgeWatcher badges={badges} />
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

// Celebrates badges earned since this browser last looked. The first visit
// only remembers what's there (no burst of toasts for old ones).
const SEEN_KEY = "tally:badges-seen";

function BadgeWatcher({ badges }: { badges: Badge[] }) {
  const { t } = useI18n();
  const toast = useToast();
  const text = useBadgeText();
  useEffect(() => {
    const earned = badges.filter((b) => b.earned).map((b) => b.key);
    let seen: string[] | null = null;
    try {
      seen = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "null");
    } catch {}
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(earned));
    } catch {}
    if (!Array.isArray(seen)) return;
    const fresh = badges.filter((b) => b.earned && !seen!.includes(b.key));
    for (const badge of fresh.slice(0, 3)) {
      toast(t.badges.unlocked(text(badge).name), { tone: "success" });
    }
    // Once per set of badges, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badges.map((b) => (b.earned ? b.key : "")).join()]);
  return null;
}
