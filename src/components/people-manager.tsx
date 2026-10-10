"use client";

import {
  Check,
  Copy,
  DotsThreeVertical,
  EnvelopeSimple,
  Key,
  LockKey,
  PaperPlaneTilt,
  PencilSimple,
  Prohibit,
  Trash,
  UserMinus,
  UserPlus,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";

import { createLoginCode, createProfileKey, deleteProfile, listProfileKeys, revokeProfileKey, saveProfile } from "@/actions/profiles";
import { respondToInvitation, sendConnection, updateConnection } from "@/actions/social";
import { useI18n } from "@/i18n/client";
import type { ActionState, ApiKey, Connection, Invitation, ManagedProfile } from "@/lib/types";

import { AccountIcon } from "./account-icon";
import { ConfirmMenuItem, Menu, MenuItem } from "./menu";
import { Avatar, displayName } from "./people-ui";
import { Sheet } from "./sheet";
import { useToast } from "./toast";
import { Button, Card, cn, EmptyState, Field, Input, SectionTitle } from "./ui";
import { submitWith } from "./use-form-action";

// Runs a server action from a button and reports the result as a toast
function useRun() {
  const toast = useToast();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<ActionState>) =>
    startTransition(async () => {
      const result = await action();
      if (result.message || !result.ok) toast(result.message ?? t.common.somethingWrong, { tone: result.ok ? "success" : "error" });
    });
  return { pending, run };
}

export function PeopleManager({
  connections,
  invitations,
  profiles,
}: {
  connections: Connection[];
  invitations: Invitation[];
  profiles: ManagedProfile[];
}) {
  const { t } = useI18n();
  const incoming = connections.filter((c) => c.status === "pending" && c.direction === "incoming");
  const outgoing = connections.filter((c) => c.status === "pending" && c.direction === "outgoing");
  const accepted = connections.filter((c) => c.status === "accepted");
  const blocked = connections.filter((c) => c.status === "blocked");

  return (
    <>
      <header className="rise pt-2">
        <h1 className="text-[28px] font-semibold tracking-tight sm:text-[32px]">{t.nav.people}</h1>
        <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-ink-2">{t.people.intro}</p>
      </header>

      {/* What's waiting on you comes first, full width */}
      {invitations.length > 0 ? (
        <section aria-labelledby="invitations-title" className="rise" style={{ "--i": 1 } as React.CSSProperties}>
          <SectionTitle id="invitations-title">{t.people.invitations}</SectionTitle>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {invitations.map((invitation) => (
              <InvitationCard key={invitation.id} invitation={invitation} />
            ))}
          </div>
        </section>
      ) : null}

      {incoming.length > 0 ? (
        <section aria-labelledby="requests-title" className="rise" style={{ "--i": 2 } as React.CSSProperties}>
          <SectionTitle id="requests-title">{t.people.requests}</SectionTitle>
          <Card className="divide-y divide-line">
            {incoming.map((connection) => (
              <RequestRow key={connection.id} connection={connection} />
            ))}
          </Card>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <section aria-labelledby="connections-title" className="rise" style={{ "--i": 3 } as React.CSSProperties}>
            <SectionTitle id="connections-title">{t.people.connections}</SectionTitle>
            {accepted.length === 0 ? (
              <Card>
                <EmptyState icon={<UsersThree size={24} />} title={t.people.noConnections} className="py-8">
                  {t.people.noConnectionsHint}
                </EmptyState>
              </Card>
            ) : (
              <>
                <Card className="divide-y divide-line">
                  {accepted.map((connection) => (
                    <ConnectionRow key={connection.id} connection={connection} />
                  ))}
                </Card>
                <p className="mt-2 px-1 text-xs text-ink-3">{t.people.removeHint}</p>
              </>
            )}
          </section>

          {outgoing.length > 0 ? (
            <section aria-labelledby="sent-title">
              <SectionTitle id="sent-title">{t.people.sent}</SectionTitle>
              <Card className="divide-y divide-line">
                {outgoing.map((connection) => (
                  <SimpleRow
                    key={connection.id}
                    connection={connection}
                    note={t.people.awaiting}
                    action="remove"
                    label={t.people.cancelRequest}
                  />
                ))}
              </Card>
            </section>
          ) : null}

          {blocked.length > 0 ? (
            <section aria-labelledby="blocked-title">
              <SectionTitle id="blocked-title">{t.people.blocked}</SectionTitle>
              <p className="-mt-2 mb-3 text-sm text-ink-2">{t.people.blockedHint}</p>
              <Card className="divide-y divide-line">
                {blocked.map((connection) => (
                  <SimpleRow key={connection.id} connection={connection} action="remove" label={t.people.unblock} />
                ))}
              </Card>
            </section>
          ) : null}
        </div>

        {/* On phones the "add" form comes before the lists */}
        <div className="order-first flex flex-col gap-5 lg:order-none lg:col-span-5">
          <AddConnection />
          <Profiles profiles={profiles} />
        </div>
      </div>
    </>
  );
}

// For a managed profile (e.g. a child), who can't use connections
export function ManagedNotice({ guardian }: { guardian: string }) {
  const { t } = useI18n();
  return (
    <>
      <h1 className="rise pt-2 text-[28px] font-semibold tracking-tight sm:text-[32px]">{t.nav.people}</h1>
      <Card className="rise flex items-start gap-4 p-6">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <LockKey size={20} />
        </span>
        <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">{t.people.managedNote(guardian)}</p>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Invitations and requests
// ---------------------------------------------------------------------------

function InvitationCard({ invitation }: { invitation: Invitation }) {
  const { t, locale } = useI18n();
  const { pending, run } = useRun();
  const inviter = displayName(invitation.invitedBy, t.people.someone);
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <AccountIcon type={invitation.account.type} size={20} />
        </span>
        <div className="min-w-0 flex-1 text-[15px] leading-relaxed">
          <p>
            {t.people.invitedYou(
              <span className="font-medium">{inviter}</span>,
              <span className="font-medium">{invitation.account.name}</span>,
              t.roles[invitation.role].label.toLowerCase(),
            )}
          </p>
          <p className="mt-1 text-sm text-ink-2">{t.roles[invitation.role].hint}.</p>
          {invitation.role === "dependent" && (invitation.spendingLimit || invitation.requiresApproval) ? (
            <p className="mt-1 text-sm text-ink-2">
              {/* In the invited account's currency, which invitations don't
                  include: a plain number instead of a possibly wrong symbol */}
              {invitation.spendingLimit
                ? t.people.limitNote(
                    <span translate="no" className="tabular">
                      {Number(invitation.spendingLimit).toLocaleString(locale, { minimumFractionDigits: 2 })}
                    </span>,
                  )
                : null}{" "}
              {invitation.requiresApproval ? t.people.approvalNote : null}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" disabled={pending} onClick={() => run(() => respondToInvitation(invitation.accountId, true))}>
          <Check size={18} weight="bold" /> {t.people.accept}
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          disabled={pending}
          onClick={() => run(() => respondToInvitation(invitation.accountId, false))}
        >
          {t.people.decline}
        </Button>
      </div>
    </Card>
  );
}

function PersonCell({ connection, note }: { connection: Connection; note?: ReactNode }) {
  const { t } = useI18n();
  const { user } = connection;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar person={user} size={40} />
      <div className="min-w-0">
        <p className="truncate font-medium">{displayName(user, t.people.someone)}</p>
        <p className="truncate text-sm text-ink-2">{note ?? user.email}</p>
      </div>
    </div>
  );
}

function RequestRow({ connection }: { connection: Connection }) {
  const { t } = useI18n();
  const { pending, run } = useRun();
  const name = displayName(connection.user, t.people.someone);
  return (
    <div className={cn("flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap", pending && "opacity-60")}>
      <PersonCell connection={connection} note={`${t.people.wantsToConnect} · ${connection.user.email ?? ""}`} />
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Button size="sm" className="flex-1 sm:flex-none" disabled={pending} onClick={() => run(() => updateConnection(connection.id, "accept"))}>
          <Check size={16} weight="bold" /> {t.people.accept}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="flex-1 sm:flex-none"
          disabled={pending}
          onClick={() => run(() => updateConnection(connection.id, "reject"))}
        >
          {t.people.decline}
        </Button>
        <Menu
          label={t.people.actionsFor(name)}
          trigger={() => (
            <span className="flex size-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
              <DotsThreeVertical size={20} weight="bold" />
            </span>
          )}
        >
          {(close) => (
            <ConfirmMenuItem
              icon={<Prohibit size={18} />}
              confirmLabel={t.people.tapAgain}
              onConfirm={() => (close(), run(() => updateConnection(connection.id, "block")))}
            >
              {t.people.block}
            </ConfirmMenuItem>
          )}
        </Menu>
      </div>
    </div>
  );
}

function ConnectionRow({ connection }: { connection: Connection }) {
  const { t, locale } = useI18n();
  const { pending, run } = useRun();
  const name = displayName(connection.user, t.people.someone);
  const since = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(
    new Date(connection.respondedAt ?? connection.createdAt),
  );
  return (
    <div className={cn("flex items-center gap-2 py-2 pr-2 pl-4", pending && "opacity-60")}>
      <PersonCell connection={connection} />
      <span className="hidden shrink-0 text-xs text-ink-3 sm:inline">{t.people.connectedSince(since)}</span>
      <Menu
        label={t.people.actionsFor(name)}
        trigger={() => (
          <span className="flex size-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
            <DotsThreeVertical size={20} weight="bold" />
          </span>
        )}
      >
        {(close) => (
          <>
            <ConfirmMenuItem
              icon={<UserMinus size={18} />}
              confirmLabel={t.people.tapAgain}
              onConfirm={() => (close(), run(() => updateConnection(connection.id, "remove")))}
            >
              {t.people.remove}
            </ConfirmMenuItem>
            <ConfirmMenuItem
              icon={<Prohibit size={18} />}
              confirmLabel={t.people.tapAgain}
              onConfirm={() => (close(), run(() => updateConnection(connection.id, "block")))}
            >
              {t.people.block}
            </ConfirmMenuItem>
          </>
        )}
      </Menu>
    </div>
  );
}

// Sent requests (cancel) and blocked people (unblock): one action each
function SimpleRow({
  connection,
  note,
  action,
  label,
}: {
  connection: Connection;
  note?: string;
  action: "remove";
  label: string;
}) {
  const { pending, run } = useRun();
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", pending && "opacity-60")}>
      <PersonCell connection={connection} note={note} />
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => updateConnection(connection.id, action))}>
        {label}
      </Button>
    </div>
  );
}

function AddConnection() {
  const { t } = useI18n();
  return (
    <Card className="rise p-6" style={{ "--i": 2 } as React.CSSProperties}>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
          <UserPlus size={20} />
        </span>
        <h2 className="text-[17px] font-semibold tracking-tight">{t.people.addTitle}</h2>
      </div>
      <ConnectByEmail />
    </Card>
  );
}

// Sends a connection request by email. Also used inside the account invite
// sheet, so someone new can be asked without leaving it.
export function ConnectByEmail({ id = "connection-email", hint }: { id?: string; hint?: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await sendConnection(prev, formData);
    if (result.ok) {
      toast(result.message ?? t.common.done);
      formRef.current?.reset();
    }
    return result;
  }, {});
  const error = state.fieldErrors?.email ?? (!state.ok && state.message && !state.fieldErrors ? state.message : undefined);

  return (
    <form ref={formRef} onSubmit={submitWith(formAction)} className="space-y-3" noValidate>
      <Field label={t.people.emailLabel} htmlFor={id} error={error} hint={hint ?? t.people.emailHint}>
        <div className="relative">
          <EnvelopeSimple size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-3" />
          <Input
            id={id}
            name="email"
            type="email"
            inputMode="email"
            // Someone else's address: don't offer the user's own
            autoComplete="off"
            spellCheck={false}
            placeholder={t.people.emailPlaceholder}
            className="pl-11"
            aria-invalid={Boolean(error)}
          />
        </div>
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        <PaperPlaneTilt size={18} /> {pending ? t.people.sending : t.people.send}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Family profiles (managed profiles)
// ---------------------------------------------------------------------------

type ProfileSheet = { kind: "edit"; profile?: ManagedProfile } | { kind: "code" | "keys"; profile: ManagedProfile };

function Profiles({ profiles }: { profiles: ManagedProfile[] }) {
  const { t } = useI18n();
  const [sheet, setSheet] = useState<(ProfileSheet & { session: number }) | null>(null);
  const [open, setOpen] = useState(false);
  const show = (value: ProfileSheet) => {
    setSheet({ ...value, session: (sheet?.session ?? 0) + 1 });
    setOpen(true);
  };
  const name = (profile?: ManagedProfile) => displayName(profile, t.people.someone);

  return (
    <Card className="rise p-3 sm:p-4" style={{ "--i": 3 } as React.CSSProperties} aria-labelledby="profiles-title">
      <div className="px-3 pt-2">
        <SectionTitle
          id="profiles-title"
          action={
            <Button size="sm" variant="secondary" onClick={() => show({ kind: "edit" })}>
              <UserPlus size={16} /> {t.profiles.add}
            </Button>
          }
        >
          {t.profiles.title}
        </SectionTitle>
        <p className="-mt-2 mb-3 text-sm leading-relaxed text-ink-2">{t.profiles.intro}</p>
      </div>

      {profiles.length ? (
        <ul>
          {profiles.map((profile) => (
            <ProfileRow
              key={profile.id}
              profile={profile}
              onEdit={() => show({ kind: "edit", profile })}
              onCode={() => show({ kind: "code", profile })}
              onKeys={() => show({ kind: "keys", profile })}
            />
          ))}
        </ul>
      ) : null}
      <p className="px-3 pt-2 pb-1 text-xs text-ink-3">{t.profiles.howToAdd}</p>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={
          sheet?.kind === "code"
            ? t.profiles.loginCodeTitle(name(sheet.profile))
            : sheet?.kind === "keys"
              ? t.profiles.keysTitle(name(sheet.profile))
              : sheet?.profile
                ? t.profiles.editProfile
                : t.profiles.newProfile
        }
      >
        {sheet?.kind === "edit" ? <ProfileForm key={sheet.session} profile={sheet.profile} onDone={() => setOpen(false)} /> : null}
        {sheet?.kind === "code" ? <LoginCode key={sheet.session} profile={sheet.profile} /> : null}
        {sheet?.kind === "keys" ? <ProfileKeys key={sheet.session} profile={sheet.profile} /> : null}
      </Sheet>
    </Card>
  );
}

function ProfileRow({
  profile,
  onEdit,
  onCode,
  onKeys,
}: {
  profile: ManagedProfile;
  onEdit: () => void;
  onCode: () => void;
  onKeys: () => void;
}) {
  const { t } = useI18n();
  const { pending, run } = useRun();
  const name = displayName(profile, t.people.someone);
  const accounts = profile.memberships
    .filter((m) => m.status === "active")
    .map((m) => m.account.name)
    .join(", ");
  return (
    <li className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5", pending && "opacity-60")}>
      <Avatar person={profile} size={40} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className="truncate font-medium">{name}</span>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-px text-xs font-medium",
              profile.hasLogin ? "bg-income-soft text-income" : "bg-surface-2 text-ink-2",
            )}
          >
            {profile.hasLogin ? <Check size={12} weight="bold" /> : <LockKey size={12} />}
            {profile.hasLogin ? t.profiles.hasLogin : t.profiles.noLogin}
          </span>
        </p>
        <p className="truncate text-sm text-ink-2">{t.profiles.accounts(accounts)}</p>
      </div>
      <Menu
        label={t.profiles.actionsFor(name)}
        trigger={() => (
          <span className="flex size-11 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
            <DotsThreeVertical size={20} weight="bold" />
          </span>
        )}
      >
        {(close) => (
          <>
            <MenuItem icon={<PencilSimple size={18} />} onClick={() => (close(), onEdit())}>
              {t.profiles.rename}
            </MenuItem>
            {!profile.hasLogin ? (
              <MenuItem icon={<LockKey size={18} />} onClick={() => (close(), onCode())}>
                {t.profiles.loginCode}
              </MenuItem>
            ) : null}
            <MenuItem icon={<Key size={18} />} onClick={() => (close(), onKeys())}>
              {t.profiles.keys}
            </MenuItem>
            <div className="mt-1.5 border-t border-line pt-1.5">
              <ConfirmMenuItem
                icon={<Trash size={18} />}
                confirmLabel={t.people.tapAgain}
                onConfirm={() => (close(), run(() => deleteProfile(profile.id)))}
              >
                {t.common.delete}
              </ConfirmMenuItem>
            </div>
          </>
        )}
      </Menu>
    </li>
  );
}

function ProfileForm({ profile, onDone }: { profile?: ManagedProfile; onDone: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await saveProfile(prev, formData);
    if (result.ok) {
      toast(result.message ?? t.common.saved);
      onDone();
    }
    return result;
  }, {});
  return (
    <form onSubmit={submitWith(formAction)} className="space-y-6" noValidate>
      {profile ? <input type="hidden" name="id" value={profile.id} /> : null}
      <Field label={t.common.name} htmlFor="profile-name" error={state.fieldErrors?.name}>
        <Input
          id="profile-name"
          name="name"
          defaultValue={profile?.name ?? ""}
          placeholder={t.profiles.namePlaceholder}
          autoComplete="off"
          autoFocus
          maxLength={100}
          aria-invalid={Boolean(state.fieldErrors?.name)}
        />
      </Field>
      {profile ? <p className="text-sm text-ink-2">{t.profiles.deleteWarning}</p> : <p className="text-sm text-ink-2">{t.profiles.howToAdd}</p>}
      {state.message && !state.ok && !state.fieldErrors ? (
        <p role="alert" className="rounded-2xl bg-expense-soft px-4 py-3 text-sm text-expense">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? t.common.saving : profile ? t.common.saveChanges : t.profiles.add}
      </Button>
    </form>
  );
}

// Shows a fresh one-time code. Making one replaces any earlier code, so it
// only happens when asked.
function LoginCode({ profile }: { profile: ManagedProfile }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const make = () =>
    startTransition(async () => {
      const result = await createLoginCode(profile.id);
      if (result.ok && result.data) {
        setCode({ code: result.data.code, expiresAt: result.data.expiresAt });
        setCopied(false);
      } else {
        toast(result.message ?? t.common.somethingWrong, { tone: "error" });
      }
    });

  return (
    <div className="space-y-5 pb-2">
      <p className="text-[15px] leading-relaxed text-ink-2">{t.profiles.loginCodeHint}</p>
      {code ? (
        <div className="rise rounded-3xl border border-accent/25 bg-accent-soft p-5 text-center">
          <p
            translate="no"
            className="font-mono text-[34px] font-semibold tracking-[0.12em] text-ink select-all"
            aria-live="polite"
          >
            {code.code}
          </p>
          <p className="mt-2 text-sm text-ink-2">
            {t.profiles.loginCodeBody(new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(code.expiresAt)))}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={async () => {
              await navigator.clipboard.writeText(code.code);
              setCopied(true);
              toast(t.profiles.codeCopied);
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? t.settings.copied : t.settings.copy}
          </Button>
        </div>
      ) : null}
      <Button size="lg" variant={code ? "secondary" : "primary"} className="w-full" disabled={pending} onClick={make}>
        <LockKey size={18} /> {pending ? t.profiles.making : code ? t.profiles.newCode : t.profiles.makeCode}
      </Button>
    </div>
  );
}

function ProfileKeys({ profile }: { profile: ManagedProfile }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [created, setCreated] = useState<{ key: string; name: string } | null>(null);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const reload = () => startTransition(async () => setKeys(await listProfileKeys(profile.id)));
  useEffect(reload, [profile.id]);

  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createProfileKey(prev, formData);
    if (result.ok && result.data) {
      setCreated({ key: result.data.key, name: result.data.name });
      formRef.current?.reset();
      reload();
    }
    return result;
  }, {});
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="space-y-5 pb-2">
      <p className="text-[15px] leading-relaxed text-ink-2">{t.profiles.keysBody}</p>

      {created ? (
        <div className="rise rounded-3xl border border-income/30 bg-income-soft p-4">
          <p className="text-sm font-medium">{t.settings.copyNow(created.name)}</p>
          <div className="mt-3 flex gap-2">
            <code
              translate="no"
              className="flex h-11 min-w-0 flex-1 items-center overflow-x-auto rounded-2xl bg-surface px-3 font-mono text-sm whitespace-nowrap"
            >
              {created.key}
            </code>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(created.key);
                toast(t.settings.keyCopied);
              }}
            >
              <Copy size={18} /> {t.settings.copy}
            </Button>
          </div>
        </div>
      ) : null}

      <form ref={formRef} onSubmit={submitWith(formAction)} className="flex flex-col gap-3 sm:flex-row sm:items-start" noValidate>
        <input type="hidden" name="profileId" value={profile.id} />
        <Field label={t.settings.newKeyName} htmlFor="profile-key-name" error={state.fieldErrors?.name} className="flex-1">
          <Input id="profile-key-name" name="name" placeholder="iPad" autoComplete="off" aria-invalid={Boolean(state.fieldErrors?.name)} />
        </Field>
        <Button type="submit" disabled={pending} className="sm:mt-7">
          {pending ? t.settings.creating : t.settings.createKey}
        </Button>
      </form>

      {keys === null ? (
        <div className="skeleton h-14 w-full rounded-3xl" />
      ) : keys.length === 0 ? (
        <p className="text-sm text-ink-2">{t.profiles.noKeys}</p>
      ) : (
        <ul className="divide-y divide-line rounded-3xl border border-line">
          {keys.map((key) => (
            <li key={key.id} className="flex items-center gap-3 py-2 pr-2 pl-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{key.name}</p>
                <p className="truncate text-sm text-ink-2">
                  <span translate="no" className="font-mono">
                    {key.prefix}…
                  </span>
                  {t.settings.keyMeta(date.format(new Date(key.createdAt)), key.lastUsedAt ? date.format(new Date(key.lastUsedAt)) : null)}
                </p>
              </div>
              <RevokeKey
                onRevoke={() =>
                  startTransition(async () => {
                    const result = await revokeProfileKey(profile.id, key.id);
                    toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
                    reload();
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Revoking stops the key at once, so it takes two taps
function RevokeKey({ onRevoke }: { onRevoke: () => void }) {
  const { t } = useI18n();
  const [armed, setArmed] = useState(false);
  return (
    <Button
      size="sm"
      variant={armed ? "danger" : "ghost"}
      className={cn(!armed && "text-expense")}
      onClick={() => (armed ? onRevoke() : setArmed(true))}
    >
      <X size={16} /> {armed ? t.settings.confirm : t.settings.revoke}
    </Button>
  );
}
