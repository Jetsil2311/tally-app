"use client";

import {
  ArrowLeft,
  ClockCounterClockwise,
  DotsThreeVertical,
  PencilSimple,
  Plus,
  Receipt,
  Robot,
  SignOut,
  UserMinus,
  UserPlus,
  UsersThree,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { inviteMember, leaveAccount, loadAuditLog, removeMember, updateMember } from "@/actions/members";
import { useI18n } from "@/i18n/client";
import { currencySymbol, formatMoney } from "@/lib/money";
import { assignableRoles, canAddTransactions, canManage, isOwner } from "@/lib/permissions";
import type {
  Account,
  ActionState,
  AuditEntry,
  AuditPage,
  Connection,
  ManagedProfile,
  Member,
  MemberRole,
  Person,
  TransactionPage,
} from "@/lib/types";

import { AccountCard } from "./account-card";
import { AccountForm } from "./accounts-manager";
import { ConfirmMenuItem, Menu, MenuItem } from "./menu";
import { Avatar, displayName, RoleBadge, RoleIcon, useViewer } from "./people-ui";
import { useAccountCurrency } from "./preferences";
import { useQuickAdd } from "./quick-add";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { TransactionRow } from "./transaction-row";
import { Button, buttonClass, Card, cn, EmptyState, Field, Input, SectionTitle } from "./ui";
import { submitWith } from "./use-form-action";

type Candidate = Person & { managed: boolean };
type SheetState = { kind: "invite" } | { kind: "member"; member: Member } | { kind: "edit" };

export function AccountDetail({
  account,
  members,
  audit,
  connections,
  profiles,
  now,
  movements,
}: {
  // The latest entries on this account
  movements: TransactionPage;
  // Request time from the server, for "2 hours ago" without a clock read in render
  now: string;
  account: Account;
  members: Member[];
  // null when your role can't read the audit log
  audit: AuditPage | null;
  connections: Connection[];
  profiles: ManagedProfile[];
}) {
  const { t } = useI18n();
  const viewer = useViewer();
  const { open: openQuickAdd } = useQuickAdd();
  const [sheet, setSheet] = useState<(SheetState & { session: number }) | null>(null);
  const [open, setOpen] = useState(false);
  const show = (value: SheetState) => {
    setSheet({ ...value, session: (sheet?.session ?? 0) + 1 });
    setOpen(true);
  };

  const role = account.myRole;
  const active = members.filter((m) => m.status === "active");
  const invited = members.filter((m) => m.status === "invited");

  // People you could add: accepted connections and your own family
  // profiles that aren't on the account yet
  const taken = new Set(members.map((m) => m.userId));
  const candidates: Candidate[] = [
    ...profiles.filter((p) => !taken.has(p.id)).map((p) => ({ ...p, managed: true })),
    ...connections
      .filter((c) => c.status === "accepted" && !taken.has(c.user.id))
      .map((c) => ({ ...c.user, managed: false })),
  ];

  return (
    <>
      <Link
        href="/accounts"
        className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-full px-2 text-sm text-ink-2 transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} /> {t.accountDetail.back}
      </Link>

      <header className="rise flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-[28px] font-semibold tracking-tight sm:text-[32px]">{account.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-2">
            <RoleBadge role={role} />
            <span>{t.accountDetail.sharedWith(active.length)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAddTransactions(role) && account.isActive ? (
            <Button onClick={() => openQuickAdd({ mode: "expense", accountId: account.id })}>
              <Plus size={18} weight="bold" /> {t.activity.addEntry}
            </Button>
          ) : null}
          {canManage(role) ? (
            <Button variant="secondary" onClick={() => show({ kind: "edit" })}>
              <PencilSimple size={18} /> {t.accounts.editAccount}
            </Button>
          ) : null}
        </div>
      </header>

      {/* Card and people on the left; what happened on the account (its
          movements, then its history) is the main column */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-5">
          <div className="rise" style={{ "--i": 1 } as React.CSSProperties}>
            <AccountCard account={account} />
          </div>
          <Card className="rise p-3 sm:p-4" style={{ "--i": 3 } as React.CSSProperties} aria-labelledby="members-title">
            <div className="px-3 pt-2">
              <SectionTitle
                id="members-title"
                action={
                  canManage(role) && !viewer.isManaged ? (
                    <Button size="sm" onClick={() => show({ kind: "invite" })}>
                      <UserPlus size={16} /> {t.members.invite}
                    </Button>
                  ) : null
                }
              >
                {t.members.title}
              </SectionTitle>
            </div>
            <ul>
              {[...active, ...invited].map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  myRole={role}
                  isMe={member.userId === viewer.id}
                  onEdit={() => show({ kind: "member", member })}
                />
              ))}
            </ul>
          </Card>
          <LeaveCard account={account} />
        </div>

        <div className="flex flex-col gap-5 lg:col-span-7">
          <Movements account={account} page={movements} />
          {audit ? <History accountId={account.id} first={audit} members={members} now={now} /> : null}
        </div>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={
          sheet?.kind === "invite"
            ? t.members.inviteTo(account.name)
            : sheet?.kind === "member"
              ? t.members.editMember(displayName(sheet.member.user, t.people.someone))
              : t.accounts.editAccount
        }
        description={sheet?.kind === "invite" ? t.members.inviteDescription : undefined}
      >
        {sheet?.kind === "invite" ? (
          <InviteForm key={sheet.session} account={account} candidates={candidates} onDone={() => setOpen(false)} />
        ) : null}
        {sheet?.kind === "member" ? (
          <MemberForm key={sheet.session} account={account} member={sheet.member} onDone={() => setOpen(false)} />
        ) : null}
        {sheet?.kind === "edit" ? <AccountForm key={sheet.session} account={account} onDone={() => setOpen(false)} /> : null}
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

function MemberRow({ member, myRole, isMe, onEdit }: { member: Member; myRole: MemberRole; isMe: boolean; onEdit: () => void }) {
  const { t, locale } = useI18n();
  // A dependent's spending limit is in the account's currency
  const currency = useAccountCurrency(member.accountId);
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const name = displayName(member.user, t.people.someone);
  const invitation = member.status === "invited";

  // Owners change roles and remove anyone; admins adjust a dependent's
  // limits and cancel invitations. Nobody edits themselves here.
  const canEdit = !isMe && (isOwner(myRole) || (canManage(myRole) && member.role === "dependent" && !invitation));
  const canRemove = !isMe && (isOwner(myRole) || (canManage(myRole) && invitation));

  const details = [
    member.user.managedById ? t.members.familyProfile : member.user.email,
    member.role === "dependent" && member.spendingLimit
      ? t.members.limitSummary(formatMoney(member.spendingLimit, currency, { locale }))
      : null,
    member.role === "dependent" && member.requiresApproval ? t.members.approvalSummary : null,
  ].filter(Boolean);

  return (
    <li className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5", pending && "opacity-60")}>
      <Avatar person={member.user} size={40} className={invitation ? "opacity-60" : undefined} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className="truncate font-medium">{name}</span>
          {isMe ? <span className="shrink-0 text-sm text-ink-3">({t.sharing.you})</span> : null}
        </p>
        <p className="truncate text-sm text-ink-2">
          {invitation ? (
            <span className="text-warn">{t.members.invitationPending}</span>
          ) : (
            details.join(" · ")
          )}
        </p>
      </div>
      <RoleBadge role={member.role} className={invitation ? "opacity-70" : undefined} />
      {canEdit || canRemove ? (
        <Menu
          label={t.members.editMember(name)}
          trigger={() => (
            <span className="flex size-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
              <DotsThreeVertical size={20} weight="bold" />
            </span>
          )}
        >
          {(close) => (
            <>
              {canEdit ? (
                <MenuItem icon={<PencilSimple size={18} />} onClick={() => (close(), onEdit())}>
                  {t.members.editMember(name)}
                </MenuItem>
              ) : null}
              {canRemove ? (
                <ConfirmMenuItem
                  icon={<UserMinus size={18} />}
                  confirmLabel={t.members.tapAgain}
                  onConfirm={() => {
                    close();
                    startTransition(async () => {
                      const result = await removeMember(member.accountId, member.userId, invitation);
                      toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
                    });
                  }}
                >
                  {invitation ? t.members.cancelInvitation : t.members.removeMember}
                </ConfirmMenuItem>
              ) : null}
            </>
          )}
        </Menu>
      ) : (
        <span className="size-11 shrink-0" aria-hidden />
      )}
    </li>
  );
}

// Radio cards: each role with what it can do, so the choice is informed
function RolePicker({ roles, value, onChange }: { roles: MemberRole[]; value: MemberRole; onChange: (role: MemberRole) => void }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t.members.role} className="grid gap-2">
      {roles.map((role) => {
        const checked = role === value;
        return (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(role)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-3 text-left transition-[border-color,background-color,box-shadow] duration-200",
              checked ? "border-accent bg-accent-soft ring-4 ring-accent-soft" : "border-line bg-surface-2 hover:border-line-strong",
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                checked ? "bg-accent text-accent-ink" : "bg-surface text-ink-2",
              )}
            >
              <RoleIcon role={role} size={18} />
            </span>
            <span className="min-w-0">
              <span className="block font-medium">{t.roles[role].label}</span>
              <span className="block text-sm leading-snug text-ink-2">{t.roles[role].hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Spending limit + "approve every entry", only for dependents
function DependentSettings({
  limit,
  requiresApproval,
  error,
  currency,
}: {
  limit?: string | null;
  requiresApproval?: boolean;
  error?: string;
  // The account's currency: limits are in it
  currency: string;
}) {
  const { t, locale } = useI18n();
  return (
    <fieldset className="space-y-4 rounded-3xl border border-line p-4">
      <legend className="px-1 text-sm font-medium">{t.members.dependentSettings}</legend>
      <Field label={t.members.spendingLimit} htmlFor="member-limit" optional error={error} hint={t.members.spendingLimitHint}>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-2">{currencySymbol(currency, locale)}</span>
          <Input
            id="member-limit"
            name="spendingLimit"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            defaultValue={limit ?? ""}
            className="tabular pl-9"
            aria-invalid={Boolean(error)}
          />
        </div>
      </Field>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="requiresApproval"
          defaultChecked={requiresApproval}
          className="mt-1 size-5 shrink-0 accent-[var(--accent)]"
        />
        <span>
          <span className="block text-[15px] font-medium">{t.members.requiresApproval}</span>
          <span className="block text-sm text-ink-2">{t.members.requiresApprovalHint}</span>
        </span>
      </label>
    </fieldset>
  );
}

function InviteForm({ account, candidates, onDone }: { account: Account; candidates: Candidate[]; onDone: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [userId, setUserId] = useState(candidates[0]?.id ?? "");
  const candidate = candidates.find((c) => c.id === userId);
  const roles = assignableRoles(account.myRole, candidate?.managed);
  // Family profiles usually join as dependents; connections as members
  const [role, setRole] = useState<MemberRole>(candidate?.managed ? "dependent" : "member");
  const effectiveRole = roles.includes(role) ? role : roles[roles.length - 1];

  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await inviteMember(prev, formData);
    if (result.ok) {
      toast(result.message ?? t.common.done);
      onDone();
    }
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};

  if (candidates.length === 0) {
    return (
      <EmptyState
        icon={<UsersThree size={24} />}
        title={t.members.noOne}
        className="py-6"
        action={
          <Link href="/people" className={buttonClass("primary")}>
            {t.members.findPeople}
          </Link>
        }
      >
        {t.members.noOneHint}
      </EmptyState>
    );
  }

  return (
    <form onSubmit={submitWith(formAction)} className="space-y-6" noValidate>
      <input type="hidden" name="accountId" value={account.id} />
      <input type="hidden" name="role" value={effectiveRole} />

      <fieldset>
        <legend className="mb-3 text-sm font-medium">{t.members.person}</legend>
        <div role="radiogroup" aria-label={t.members.person} className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {candidates.map((person) => {
            const checked = person.id === userId;
            return (
              <label
                key={person.id}
                className={cn(
                  "inline-flex min-h-12 shrink-0 cursor-pointer items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-[15px] transition-[background-color,border-color] duration-200",
                  "has-focus-visible:ring-4 has-focus-visible:ring-accent-soft",
                  checked ? "border-ink bg-ink text-surface" : "border-line bg-surface-2 hover:border-line-strong",
                )}
              >
                <input
                  type="radio"
                  name="userId"
                  value={person.id}
                  checked={checked}
                  onChange={() => {
                    setUserId(person.id);
                    if (person.managed) setRole("dependent");
                  }}
                  className="sr-only"
                />
                <Avatar person={person} size={32} />
                <span className="max-w-40 truncate">{displayName(person, t.people.someone)}</span>
              </label>
            );
          })}
        </div>
        {errors.userId ? (
          <p role="alert" className="mt-2 text-sm text-expense">
            {errors.userId}
          </p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-medium">{t.members.role}</legend>
        <RolePicker roles={roles} value={effectiveRole} onChange={setRole} />
        {candidate?.managed ? <p className="mt-2 text-sm text-ink-2">{t.members.managedRoles}</p> : null}
      </fieldset>

      {effectiveRole === "dependent" ? <DependentSettings error={errors.spendingLimit} currency={account.currency} /> : null}

      {state.message && !state.ok && !Object.keys(errors).length ? (
        <p role="alert" className="rounded-2xl bg-expense-soft px-4 py-3 text-sm text-expense">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        <UserPlus size={18} /> {pending ? t.common.saving : candidate?.managed ? t.members.addProfile : t.members.sendInvite}
      </Button>
    </form>
  );
}

function MemberForm({ account, member, onDone }: { account: Account; member: Member; onDone: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const owner = isOwner(account.myRole);
  const roles = assignableRoles(account.myRole, Boolean(member.user.managedById));
  const [role, setRole] = useState<MemberRole>(member.role);

  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await updateMember(prev, formData);
    if (result.ok) {
      toast(result.message ?? t.common.saved);
      onDone();
    }
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={submitWith(formAction)} className="space-y-6" noValidate>
      <input type="hidden" name="accountId" value={account.id} />
      <input type="hidden" name="userId" value={member.userId} />
      <input type="hidden" name="originalRole" value={member.role} />
      <input type="hidden" name="role" value={role} />

      <div className="flex items-center gap-3">
        <Avatar person={member.user} size={44} />
        <div className="min-w-0">
          <p className="truncate font-medium">{displayName(member.user, t.people.someone)}</p>
          <p className="truncate text-sm text-ink-2">{member.user.managedById ? t.members.familyProfile : member.user.email}</p>
        </div>
      </div>

      <fieldset>
        <legend className="mb-3 text-sm font-medium">{t.members.role}</legend>
        {owner ? (
          <RolePicker roles={roles} value={role} onChange={setRole} />
        ) : (
          <p className="flex items-center gap-2 text-sm text-ink-2">
            <RoleBadge role={member.role} /> {t.members.onlyOwnersRoles}
          </p>
        )}
      </fieldset>

      {role === "dependent" ? (
        <DependentSettings
          limit={member.spendingLimit}
          requiresApproval={member.requiresApproval}
          error={errors.spendingLimit}
          currency={account.currency}
        />
      ) : null}

      {state.message && !state.ok && !Object.keys(errors).length ? (
        <p role="alert" className="rounded-2xl bg-expense-soft px-4 py-3 text-sm text-expense">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? t.common.saving : t.common.saveChanges}
      </Button>
    </form>
  );
}

// Anyone can leave, except the last owner (the API answers 409 and the
// toast explains)
function LeaveCard({ account }: { account: Account }) {
  const { t } = useI18n();
  const toast = useToast();
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  if (account.memberCount <= 1) return null;
  return (
    <Card className="rise p-5" style={{ "--i": 3 } as React.CSSProperties}>
      <p className="text-sm leading-relaxed text-ink-2">{t.members.leaveHint}</p>
      <Button
        variant={armed ? "danger" : "ghost"}
        size="sm"
        className={cn("mt-3", !armed && "-ml-3.5 text-expense")}
        disabled={pending}
        onClick={() => {
          if (!armed) return setArmed(true);
          startTransition(async () => {
            const result = await leaveAccount(account.id);
            // On success the action redirects; a result means it didn't work
            if (result) toast(result.message ?? t.common.somethingWrong, { tone: "error" });
            setArmed(false);
          });
        }}
      >
        <SignOut size={16} /> {armed ? t.members.leaveConfirm : t.members.leave}
      </Button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Movements
// ---------------------------------------------------------------------------

// The account's latest entries. Tapping one opens it (edit, or the read-only
// view, depending on your role); "See all" opens Activity with this
// account's filter for search and other months.
function Movements({ account, page }: { account: Account; page: TransactionPage }) {
  const { t } = useI18n();
  const { open } = useQuickAdd();
  const allHref = `/activity?account=${account.id}&month=all`;
  return (
    <Card className="rise p-3 sm:p-4" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="movements-title">
      <div className="px-3 pt-2">
        <SectionTitle
          id="movements-title"
          action={
            page.data.length ? (
              <Link href={allHref} className="text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline">
                {t.accountDetail.seeAllMovements}
              </Link>
            ) : null
          }
        >
          {t.accountDetail.movements}
        </SectionTitle>
      </div>
      {page.data.length ? (
        <>
          <div className="-mt-1">
            {page.data.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} showDate />
            ))}
          </div>
          {page.nextCursor ? (
            <div className="px-3 pt-2 pb-1">
              <Link href={allHref} className={buttonClass("ghost", "sm")}>
                <Receipt size={16} /> {t.accountDetail.seeAllMovements}
              </Link>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={<Receipt size={24} />}
          title={t.accountDetail.noMovements}
          className="py-8"
          action={
            canAddTransactions(account.myRole) && account.isActive ? (
              <Button onClick={() => open({ mode: "expense", accountId: account.id })}>{t.activity.addEntry}</Button>
            ) : undefined
          }
        >
          {t.accountDetail.noMovementsHint}
        </EmptyState>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

function History({ accountId, first, members, now }: { accountId: string; first: AuditPage; members: Member[]; now: string }) {
  const { t, locale } = useI18n();
  const viewer = useViewer();
  // Amounts in the log are in the account's currency
  const currency = useAccountCurrency(accountId);
  const [entries, setEntries] = useState<AuditEntry[]>(first.data);
  const [cursor, setCursor] = useState(first.nextCursor);
  const [pending, startTransition] = useTransition();

  const names = new Map(members.map((m) => [m.userId, displayName(m.user, t.audit.someone)]));
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const absolute = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  const when = (iso: string) => {
    const seconds = (Date.parse(iso) - Date.parse(now)) / 1000;
    const steps: [Intl.RelativeTimeFormatUnit, number][] = [
      ["second", 60],
      ["minute", 60],
      ["hour", 24],
      ["day", 7],
    ];
    let value = seconds;
    for (const [unit, size] of steps) {
      if (Math.abs(value) < size) return relative.format(Math.round(value), unit);
      value /= size;
    }
    return absolute.format(new Date(iso));
  };

  const describe = (entry: AuditEntry) => {
    const p = (entry.payload ?? {}) as Record<string, unknown>;
    const changes = (p.changes ?? {}) as Record<string, unknown>;
    const roleKey = (typeof changes.role === "string" ? changes.role : p.role) as MemberRole | undefined;
    const who = entry.user ? (entry.user.id === viewer.id ? t.sharing.you : (entry.user.name ?? t.audit.someone)) : t.audit.system;
    return t.audit.describe({
      action: entry.action,
      who,
      subject: typeof p.userId === "string" ? (p.userId === viewer.id ? t.sharing.you.toLowerCase() : (names.get(p.userId) ?? t.audit.someone.toLowerCase())) : "",
      role: roleKey && t.roles[roleKey] ? t.roles[roleKey].label.toLowerCase() : "",
      amount: typeof p.amount === "string" || typeof p.amount === "number" ? formatMoney(p.amount, currency, { locale }) : "",
      kind: p.type === "income" ? "income" : "expense",
      name: typeof p.name === "string" ? p.name : typeof p.description === "string" ? p.description : "",
    });
  };

  return (
    <Card className="rise p-3 sm:p-4" style={{ "--i": 4 } as React.CSSProperties} aria-labelledby="history-title">
      <div className="px-3 pt-2">
        <SectionTitle id="history-title">{t.accountDetail.history}</SectionTitle>
        <p className="-mt-2 mb-2 text-sm text-ink-2">{t.accountDetail.historyHint}</p>
      </div>
      {entries.length === 0 ? (
        <EmptyState icon={<ClockCounterClockwise size={24} />} title={t.accountDetail.noHistory} className="py-6" />
      ) : (
        <ol className="relative">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 px-3 py-2.5">
              {entry.user ? (
                <Avatar person={{ name: entry.user.name, imageUrl: null }} size={32} />
              ) : (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-3 text-ink-2" aria-hidden>
                  <Robot size={16} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-snug">{describe(entry)}</p>
                <p className="mt-0.5 text-xs text-ink-3">
                  <time dateTime={entry.createdAt} title={absolute.format(new Date(entry.createdAt))}>
                    {when(entry.createdAt)}
                  </time>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
      {cursor ? (
        <div className="px-3 pt-1 pb-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const page = await loadAuditLog(accountId, cursor);
                setEntries((list) => [...list, ...page.data]);
                setCursor(page.nextCursor);
              })
            }
          >
            {pending ? t.accountDetail.loading : t.accountDetail.showOlder}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
