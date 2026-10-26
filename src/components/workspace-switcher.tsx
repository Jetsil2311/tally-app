"use client";

import { CaretUpDown, Check, Plus, Storefront, User } from "@phosphor-icons/react";
import { Suspense, use, useActionState, useState, useTransition } from "react";

import { createWorkspace, switchWorkspace } from "@/actions/workspaces";
import { useI18n } from "@/i18n/client";
import { currencyName } from "@/lib/money";
import type { ActionState, Workspace } from "@/lib/types";

import { Menu, MenuItem } from "./menu";
import { usePreferences } from "./preferences";
import { Sheet } from "./sheet";
import { Button, Field, Input, Select, cn } from "./ui";
import { submitWith } from "./use-form-action";

// Notion-style workspaces: your personal money and each business live side
// by side, and switching changes every screen at once. The switch happens on
// the server (a cookie the API calls read), then lands on that workspace's home.

export function WorkspaceIcon({ workspace, size = 32 }: { workspace: Pick<Workspace, "type" | "icon">; size?: number }) {
  const Icon = workspace.type === "business" ? Storefront : User;
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.55 }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[30%] leading-none",
        workspace.type === "business" ? "bg-accent-soft text-accent" : "bg-surface-3 text-ink-2",
      )}
    >
      {workspace.icon ?? <Icon size={size * 0.55} weight="duotone" />}
    </span>
  );
}

function useWorkspaceName() {
  const { t } = useI18n();
  return (workspace: Workspace) => (workspace.type === "personal" ? t.workspaces.personal : workspace.name ?? t.workspaces.personal);
}

export function WorkspaceSwitcher({
  workspaces,
  current,
  compact,
}: {
  workspaces: Promise<Workspace[]>;
  current: Promise<Workspace | null>;
  // Phones: just the icon
  compact?: boolean;
}) {
  return (
    <Suspense fallback={<div className={cn("skeleton rounded-2xl", compact ? "size-9" : "h-12 w-full")} />}>
      <Switcher workspaces={workspaces} current={current} compact={compact} />
    </Suspense>
  );
}

function Switcher({ workspaces: listPromise, current: currentPromise, compact }: { workspaces: Promise<Workspace[]>; current: Promise<Workspace | null>; compact?: boolean }) {
  const workspaces = use(listPromise);
  const current = use(currentPromise);
  const { t } = useI18n();
  const nameOf = useWorkspaceName();
  const [creating, setCreating] = useState(false);
  const [switching, startSwitch] = useTransition();
  const [target, setTarget] = useState<string | null>(null);

  // An API without workspaces: nothing to switch between
  if (!current || workspaces.length === 0) return null;

  const pick = (id: string) =>
    startSwitch(async () => {
      setTarget(id);
      await switchWorkspace(id);
    });

  return (
    <>
      <Menu
        label={t.workspaces.switcher}
        align="start"
        panelClassName="w-72"
        buttonClassName={compact ? undefined : "block w-full rounded-2xl"}
        trigger={({ open }) =>
          compact ? (
            <span className="flex h-11 items-center gap-1 rounded-full pr-1.5 pl-1 transition-colors hover:bg-surface-2">
              <WorkspaceIcon workspace={current} size={30} />
              <CaretUpDown size={14} className="text-ink-3" aria-hidden />
            </span>
          ) : (
            <span
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-2xl border px-2.5 py-2 text-left transition-[background-color,border-color] duration-200",
                open ? "border-line-strong bg-surface-2" : "border-line/70 hover:border-line-strong hover:bg-surface-2/70",
              )}
            >
              <WorkspaceIcon workspace={current} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-ink">{nameOf(current)}</span>
                <span className="block truncate text-xs text-ink-3">
                  {current.type === "personal" ? t.workspaces.personalHint : t.workspaces.accounts(current.accountCount)}
                </span>
              </span>
              <CaretUpDown size={16} className="shrink-0 text-ink-3" aria-hidden />
            </span>
          )
        }
      >
        {(close) => (
          <>
            <p className="px-3 pt-2 pb-1.5 text-xs font-semibold text-ink-3">{t.workspaces.switcher}</p>
            <ul className="space-y-0.5">
              {workspaces.map((workspace) => {
                const active = workspace.id === current.id;
                return (
                  <li key={workspace.id}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      disabled={switching}
                      onClick={() => (active ? close() : pick(workspace.id))}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-3 rounded-2xl px-2.5 py-1.5 text-left transition-colors hover:bg-surface-2 disabled:opacity-60",
                        active && "bg-surface-2",
                      )}
                    >
                      <WorkspaceIcon workspace={workspace} size={30} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-ink">{nameOf(workspace)}</span>
                        <span className="block truncate text-xs text-ink-3">
                          {workspace.type === "personal"
                            ? t.workspaces.personalHint
                            : workspace.role === "member"
                              ? t.workspaces.shared
                              : t.workspaces.accounts(workspace.accountCount)}
                        </span>
                      </span>
                      {active ? <Check size={16} weight="bold" className="text-accent" aria-hidden /> : null}
                      {switching && target === workspace.id ? <span className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-1.5 border-t border-line pt-1.5">
              <MenuItem icon={<Plus size={18} />} onClick={() => (close(), setCreating(true))}>
                {t.workspaces.newBusiness}
              </MenuItem>
            </div>
          </>
        )}
      </Menu>
      <NewWorkspaceSheet open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

export function NewWorkspaceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} title={t.workspaces.newBusiness} description={t.workspaces.createIntro}>
      {/* Remounted per opening, so a half-typed form doesn't come back */}
      {open ? <NewWorkspaceForm /> : null}
    </Sheet>
  );
}

const ICONS = ["☕", "🧋", "🍰", "🥐", "🍕", "🛍️", "💈", "🌮"];

function NewWorkspaceForm() {
  const { t, locale } = useI18n();
  const { currency: preferred, currencies } = usePreferences();
  const [icon, setIcon] = useState(ICONS[0]!);
  // On success the action redirects into the new workspace
  const [state, formAction, pending] = useActionState(createWorkspace, {} as ActionState);
  const errors = state.fieldErrors ?? {};
  const options = currencies.includes(preferred) ? currencies : [preferred, ...currencies];

  return (
    <form onSubmit={submitWith(formAction)} className="space-y-6" noValidate>
      <input type="hidden" name="icon" value={icon} />
      <Field label={t.workspaces.name} htmlFor="workspace-name" error={errors.name}>
        <Input id="workspace-name" name="name" placeholder={t.workspaces.namePlaceholder} autoComplete="organization" autoFocus aria-invalid={Boolean(errors.name)} />
      </Field>
      <fieldset>
        <legend className="mb-3 text-sm font-medium">{t.workspaces.icon}</legend>
        <div className="flex flex-wrap gap-2">
          {ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="radio"
              aria-checked={icon === emoji}
              aria-label={emoji}
              onClick={() => setIcon(emoji)}
              className={cn(
                "flex size-12 items-center justify-center rounded-2xl border text-2xl transition-[border-color,background-color,box-shadow] duration-200",
                icon === emoji ? "border-accent bg-accent-soft ring-4 ring-accent-soft" : "border-line bg-surface-2 hover:border-line-strong",
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </fieldset>
      <Field label={t.workspaces.currency} htmlFor="workspace-currency" error={errors.currency}>
        <Select id="workspace-currency" name="currency" defaultValue={preferred} translate="no">
          {options.map((code) => (
            <option key={code} value={code}>
              {code} · {currencyName(code, locale)}
            </option>
          ))}
        </Select>
      </Field>
      {state.message && !state.ok ? (
        <p role="alert" className="text-sm text-expense">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.workspaces.creating : t.workspaces.create}
      </Button>
    </form>
  );
}
