"use client";

import { ArrowsClockwise, CheckCircle, Key, Plugs, PlugsConnected, Storefront, Trash, WarningCircle } from "@phosphor-icons/react";
import { useActionState, useState, useTransition } from "react";

import { connectPos, deleteWorkspace, disconnectPos, setPosAccount, syncPos, updateWorkspace } from "@/actions/workspaces";
import { useI18n } from "@/i18n/client";
import type { Account, ActionState, PosConnection, Workspace } from "@/lib/types";

import { useToast } from "./toast";
import { Button, Card, EmptyState, Field, Input, Select, cn } from "./ui";
import { submitWith } from "./use-form-action";
import { NewWorkspaceSheet, WorkspaceIcon } from "./workspace-switcher";

// In the personal workspace, /business explains what a business workspace is
export function BusinessIntro() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <EmptyState
        icon={<Storefront size={28} weight="duotone" />}
        title={t.business.personalTitle}
        action={<Button onClick={() => setOpen(true)}>{t.workspaces.newBusiness}</Button>}
      >
        {t.business.personalBody}
      </EmptyState>
      <NewWorkspaceSheet open={open} onClose={() => setOpen(false)} />
    </Card>
  );
}

function useRelativeTime() {
  const { locale } = useI18n();
  return (iso: string) => {
    const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
    return rtf.format(Math.round(hours / 24), "day");
  };
}

// The POS connection: a form to connect it, or its status with "Sync now"
export function PosPanel({ workspace, connection, accounts }: { workspace: Workspace; connection: PosConnection; accounts: Account[] }) {
  const { t } = useI18n();
  const isOwner = workspace.role === "owner";
  // The POS reports in its own currency (MXN); synced entries can only go to an account in it
  const eligible = accounts.filter((a) => a.isActive && (a.myRole === "owner" || a.myRole === "admin"));

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className={cn("icon-tile flex size-12 shrink-0 items-center justify-center rounded-2xl", connection.connected ? "text-income" : "text-accent")}>
          {connection.connected ? <PlugsConnected size={24} weight="duotone" /> : <Plugs size={24} weight="duotone" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{t.business.posTitle}</h2>
          <p className="mt-0.5 text-sm text-ink-2">{connection.connected ? connection.businessName ?? connection.baseUrl : t.business.posIntro}</p>
        </div>
      </div>
      <div className="mt-5">
        {connection.connected ? (
          <PosStatus workspace={workspace} connection={connection} accounts={eligible} isOwner={isOwner} />
        ) : isOwner ? (
          <ConnectForm workspace={workspace} accounts={eligible} />
        ) : (
          <p className="text-sm text-ink-2">{t.business.notConnectedMember}</p>
        )}
      </div>
    </Card>
  );
}

function ConnectForm({ workspace, accounts }: { workspace: Workspace; accounts: Account[] }) {
  const { t } = useI18n();
  const toast = useToast();
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await connectPos(prev, formData);
    if (result.ok) toast(result.message ?? t.business.connected);
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={submitWith(formAction)} className="space-y-5" noValidate>
      <input type="hidden" name="workspaceId" value={workspace.id} />
      <p className="flex gap-2.5 rounded-2xl bg-surface-2 p-3.5 text-sm leading-relaxed text-ink-2">
        <Key size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        {t.business.howTo}
      </p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t.business.url} htmlFor="pos-url" error={errors.url} hint={t.business.urlHint}>
          <Input id="pos-url" name="url" type="url" inputMode="url" placeholder={t.business.urlPlaceholder} autoComplete="url" aria-invalid={Boolean(errors.url)} />
        </Field>
        <Field label={t.business.apiKey} htmlFor="pos-key" error={errors.apiKey}>
          <Input id="pos-key" name="apiKey" type="password" placeholder="bkpos_…" autoComplete="off" spellCheck={false} aria-invalid={Boolean(errors.apiKey)} />
        </Field>
      </div>
      {accounts.length > 1 ? (
        <Field label={t.business.account} htmlFor="pos-account" hint={t.business.accountHint}>
          <Select id="pos-account" name="accountId" defaultValue={accounts[0]?.id}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} · {account.currency}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {state.message && !state.ok ? (
        <p role="alert" className="flex gap-2 text-sm text-expense">
          <WarningCircle size={18} className="mt-0.5 shrink-0" aria-hidden /> {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        <Plugs size={18} /> {pending ? t.business.connecting : t.business.connect}
      </Button>
    </form>
  );
}

function PosStatus({
  workspace,
  connection,
  accounts,
  isOwner,
}: {
  workspace: Workspace;
  connection: Extract<PosConnection, { connected: true }>;
  accounts: Account[];
  isOwner: boolean;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const relative = useRelativeTime();
  const [syncing, startSync] = useTransition();
  const [saving, startSave] = useTransition();
  const [armed, setArmed] = useState(false);
  const failed = connection.lastSyncStatus === "error";

  const run = (action: () => Promise<ActionState>, start: typeof startSync) =>
    start(async () => {
      const result = await action();
      toast(result.message ?? t.common.done, { tone: result.ok ? "success" : "error" });
    });

  return (
    <div className="space-y-4">
      <div className={cn("flex items-start gap-2.5 rounded-2xl p-3.5 text-sm", failed ? "bg-expense-soft text-expense" : "bg-surface-2 text-ink-2")}>
        {failed ? <WarningCircle size={18} className="mt-0.5 shrink-0" aria-hidden /> : <CheckCircle size={18} className="mt-0.5 shrink-0 text-income" aria-hidden />}
        <div className="min-w-0">
          <p className="font-medium text-ink">
            {failed ? t.business.syncFailed : connection.lastSyncAt ? t.business.lastSync(relative(connection.lastSyncAt)) : t.business.neverSynced}
          </p>
          <p className="mt-0.5">{failed && connection.lastSyncError ? connection.lastSyncError : t.business.autoSync}</p>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink-3">{t.business.account}</dt>
          <dd className="mt-1">
            {isOwner && accounts.length > 0 ? (
              <Select
                aria-label={t.business.account}
                value={connection.account?.id ?? ""}
                disabled={saving}
                onChange={(e) => e.target.value && run(() => setPosAccount(workspace.id, e.target.value), startSave)}
              >
                {connection.account ? null : <option value="">{t.business.noAccount}</option>}
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.currency}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="font-medium text-ink">{connection.account?.name ?? t.business.noAccount}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink-3">{t.business.url}</dt>
          <dd className="mt-1 truncate font-medium text-ink" translate="no">
            {connection.baseUrl}
          </dd>
          <dd className="mt-0.5 text-ink-3" translate="no">
            {t.business.keyInUse(connection.keyHint)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run(() => syncPos(workspace.id), startSync)} disabled={syncing}>
          <ArrowsClockwise size={18} className={syncing ? "animate-spin" : undefined} /> {syncing ? t.business.syncing : t.business.syncNow}
        </Button>
        {isOwner ? (
          <Button
            variant={armed ? "danger" : "ghost"}
            disabled={saving}
            onBlur={() => setArmed(false)}
            onClick={() => (armed ? run(() => disconnectPos(workspace.id), startSave) : setArmed(true))}
          >
            <Plugs size={18} /> {armed ? t.business.confirmDisconnect : t.business.disconnect}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// Rename / emoji / delete. Owner only.
export function WorkspaceSettings({ workspace }: { workspace: Workspace }) {
  const { t } = useI18n();
  const toast = useToast();
  const [deleting, startDelete] = useTransition();
  const [armed, setArmed] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await updateWorkspace(prev, formData);
    if (result.ok) toast(result.message ?? t.common.saved);
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <WorkspaceIcon workspace={workspace} size={48} />
        <div>
          <h2 className="text-lg font-semibold">{t.workspaces.settings}</h2>
          <p className="mt-0.5 text-sm text-ink-2">{t.workspaces.settingsIntro}</p>
        </div>
      </div>
      <form onSubmit={submitWith(formAction)} className="mt-5 grid grid-cols-[5rem_1fr] gap-3 sm:grid-cols-[5rem_1fr_auto] sm:items-end" noValidate>
        <input type="hidden" name="id" value={workspace.id} />
        <Field label={t.workspaces.icon} htmlFor="ws-icon">
          <Input id="ws-icon" name="icon" defaultValue={workspace.icon ?? ""} maxLength={8} className="text-center text-xl" autoComplete="off" />
        </Field>
        <Field label={t.workspaces.name} htmlFor="ws-name" error={errors.name}>
          <Input id="ws-name" name="name" defaultValue={workspace.name ?? ""} autoComplete="organization" aria-invalid={Boolean(errors.name)} />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending} className="col-span-2 sm:col-span-1">
          {pending ? t.common.saving : t.common.saveChanges}
        </Button>
      </form>
      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[52ch] text-sm text-ink-2">{t.workspaces.deleteHint}</p>
        <Button
          variant={armed ? "danger" : "ghost"}
          disabled={deleting}
          onBlur={() => setArmed(false)}
          onClick={() =>
            armed
              ? startDelete(async () => {
                  // Redirects to personal when it works
                  const result = await deleteWorkspace(workspace.id);
                  if (!result.ok) toast(result.message ?? t.common.somethingWrong, { tone: "error" });
                })
              : setArmed(true)
          }
          className={armed ? undefined : "text-expense hover:bg-expense-soft hover:text-expense"}
        >
          <Trash size={18} /> {armed ? t.workspaces.confirmDelete : t.workspaces.delete}
        </Button>
      </div>
    </Card>
  );
}
