"use client";

import { Clock, Crown, Eye, SealQuestion, ShieldCheck, User, UserCircle, XCircle } from "@phosphor-icons/react";
import Image from "next/image";
import { createContext, use, type ReactNode } from "react";

import { useI18n } from "@/i18n/client";
import type { MemberRole, TransactionStatus } from "@/lib/types";

import { cn } from "./ui";

// ---------------------------------------------------------------------------
// Who is looking: the signed-in user, for "You" labels and permission checks
// ---------------------------------------------------------------------------

export interface Viewer {
  id: string;
  name: string | null;
  // A managed profile (e.g. a child): no new accounts, connections or API keys
  isManaged: boolean;
}

const ViewerContext = createContext<Viewer | null>(null);

export function ViewerProvider({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  return <ViewerContext value={viewer}>{children}</ViewerContext>;
}

export function useViewer() {
  const viewer = use(ViewerContext);
  if (!viewer) throw new Error("useViewer must be used inside ViewerProvider");
  return viewer;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export interface AvatarPerson {
  name: string | null;
  email?: string | null;
  imageUrl: string | null;
}

export function displayName(person: AvatarPerson | null | undefined, fallback: string) {
  return person?.name || person?.email || fallback;
}

function initials(person: AvatarPerson) {
  return (person.name || person.email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Photo when there is one, initials otherwise. Decorative: the name is
// always written next to it.
export function Avatar({ person, size = 36, className }: { person: AvatarPerson; size?: number; className?: string }) {
  if (person.imageUrl) {
    return (
      <Image
        src={person.imageUrl}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full bg-surface-3 object-cover", className)}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.38)) }}
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent", className)}
    >
      {initials(person)}
    </span>
  );
}

// Overlapping faces, e.g. on a shared account card
export function AvatarStack({ people, max = 3, size = 24 }: { people: AvatarPerson[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <span className="flex items-center" aria-hidden>
      {shown.map((person, i) => (
        <Avatar key={i} person={person} size={size} className={cn("ring-2 ring-surface", i > 0 && "-ml-2")} />
      ))}
      {rest > 0 ? (
        <span
          style={{ width: size, height: size }}
          className="-ml-2 flex items-center justify-center rounded-full bg-surface-3 text-[11px] font-medium text-ink-2 ring-2 ring-surface"
        >
          +{rest}
        </span>
      ) : null}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Roles and statuses: always an icon plus words, never colour alone
// ---------------------------------------------------------------------------

const ROLE_ICONS: Record<MemberRole, typeof Crown> = {
  owner: Crown,
  admin: ShieldCheck,
  member: User,
  viewer: Eye,
  dependent: UserCircle,
};

export function RoleBadge({ role, className }: { role: MemberRole; className?: string }) {
  const { t } = useI18n();
  const Icon = ROLE_ICONS[role];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        role === "owner" || role === "admin" ? "bg-accent-soft text-accent" : "bg-surface-2 text-ink-2",
        className,
      )}
    >
      <Icon size={13} weight="bold" aria-hidden />
      {t.roles[role].label}
    </span>
  );
}

export function RoleIcon({ role, size = 18 }: { role: MemberRole; size?: number }) {
  const Icon = ROLE_ICONS[role];
  return <Icon size={size} aria-hidden />;
}

// Only pending and rejected get a pill; approved is the normal state
export function TxStatusPill({ status, className }: { status: TransactionStatus; className?: string }) {
  const { t } = useI18n();
  if (status === "approved") return null;
  // Three looks that can't be confused: waiting for a guardian (amber),
  // waiting to be confirmed (accent), rejected (red)
  const Icon = status === "pending" ? Clock : status === "unverified" ? SealQuestion : XCircle;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-px text-xs font-medium",
        status === "pending" && "bg-warn-soft text-warn",
        status === "unverified" && "bg-accent-soft text-accent",
        status === "rejected" && "bg-expense-soft text-expense",
        className,
      )}
    >
      <Icon size={12} weight="bold" aria-hidden />
      {t.approvals.status[status]}
    </span>
  );
}

// "View only" next to things this role can see but not change
export function ViewOnlyTag({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-2", className)}>
      <Eye size={13} aria-hidden />
      {t.sharing.viewOnly}
    </span>
  );
}
