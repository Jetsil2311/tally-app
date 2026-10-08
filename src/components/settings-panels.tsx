"use client";

import { Check, Copy, Desktop, Key, Moon, Sun, Trash, WarningOctagon } from "@phosphor-icons/react";
import { useActionState, useState, useTransition } from "react";

import { createApiKey, deleteMyAccount, revokeApiKey } from "@/actions/settings";
import { CURRENCIES, currencySymbol } from "@/lib/money";
import type { ActionState, ApiKey } from "@/lib/types";

import { Segmented } from "./chips";
import { usePreferences } from "./preferences";
import { setTheme, useTheme } from "./theme";
import { useToast } from "./toast";
import { Button, Card, Field, Input, Select, cn } from "./ui";
import { submitWith } from "./use-form-action";

export function AppearancePanel() {
  const theme = useTheme();
  const { currency, setCurrency } = usePreferences();
  return (
    <Card className="p-6">
      <h2 className="text-[17px] font-semibold tracking-tight">Appearance</h2>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-medium">Theme</p>
          <Segmented
            label="Theme"
            value={theme}
            onChange={setTheme}
            className="w-full"
            options={[
              { value: "light", label: "Light", icon: <Sun size={16} /> },
              { value: "dark", label: "Dark", icon: <Moon size={16} /> },
              { value: "system", label: "Auto", icon: <Desktop size={16} /> },
            ]}
          />
        </div>
        <Field label="Display currency" htmlFor="currency" hint="Changes how amounts are shown. Values aren't converted.">
          <Select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {currencySymbol(c.code)} {c.name} ({c.code})
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Card>
  );
}

export function ApiKeysPanel({ keys, timeZone }: { keys: ApiKey[]; timeZone: string }) {
  const toast = useToast();
  const [created, setCreated] = useState<{ key: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await createApiKey(prev, formData);
    if (result.ok && result.data) {
      setCreated({ key: result.data.key, name: result.data.name });
      setCopied(false);
    }
    return result;
  }, {});
  const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone });

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Key size={20} />
        </span>
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight">Apple Shortcuts & API keys</h2>
          <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-ink-2">
            Log Apple Pay purchases automatically. Create a key, then add a “Get Contents of URL” action that POSTs to{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px]">/transactions</code> with the header{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px]">X-API-Key</code>. Name accounts like the cards in
            your Wallet so they match.
          </p>
        </div>
      </div>

      {created ? (
        <div className="rise mt-5 rounded-3xl border border-income/30 bg-income-soft p-4">
          <p className="text-sm font-medium">Copy “{created.name}” now. It won&apos;t be shown again.</p>
          <div className="mt-3 flex gap-2">
            <code className="flex h-11 min-w-0 flex-1 items-center overflow-x-auto rounded-2xl bg-surface px-3 font-mono text-sm whitespace-nowrap">
              {created.key}
            </code>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(created.key);
                setCopied(true);
                toast("Key copied");
              }}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      ) : null}

      <form onSubmit={submitWith(formAction)} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start" noValidate>
        <Field label="New key name" htmlFor="key-name" error={state.fieldErrors?.name} className="flex-1">
          <Input id="key-name" name="name" placeholder="iPhone Shortcuts" autoComplete="off" aria-invalid={Boolean(state.fieldErrors?.name)} />
        </Field>
        <Button type="submit" disabled={pending} className="sm:mt-7">
          {pending ? "Creating…" : "Create key"}
        </Button>
      </form>
      {state.message && !state.ok && !state.fieldErrors?.name ? (
        <p role="alert" className="mt-3 text-sm text-expense">
          {state.message}
        </p>
      ) : null}

      {keys.length ? (
        <ul className="mt-6 divide-y divide-line rounded-3xl border border-line">
          {keys.map((key) => (
            <KeyRow key={key.id} apiKey={key} format={(d) => date.format(new Date(d))} />
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

function KeyRow({ apiKey, format }: { apiKey: ApiKey; format: (date: string) => string }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{apiKey.name}</p>
        <p className="truncate text-sm text-ink-2">
          <span className="font-mono">{apiKey.prefix}…</span> · created {format(apiKey.createdAt)} ·{" "}
          {apiKey.lastUsedAt ? `last used ${format(apiKey.lastUsedAt)}` : "never used"}
        </p>
      </div>
      <Button
        size="sm"
        variant={confirming ? "danger" : "ghost"}
        className={cn(!confirming && "text-expense")}
        disabled={pending}
        onClick={() => {
          if (!confirming) return setConfirming(true);
          startTransition(async () => {
            const result = await revokeApiKey(apiKey.id);
            toast(result.message ?? "Revoked", { tone: result.ok ? "success" : "error" });
          });
        }}
      >
        <Trash size={16} /> {confirming ? "Confirm" : "Revoke"}
      </Button>
    </li>
  );
}

export function DangerZone() {
  const [state, formAction, pending] = useActionState(deleteMyAccount, {});
  const [value, setValue] = useState("");
  return (
    <Card className="border-expense/30 p-6">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-expense-soft text-expense">
          <WarningOctagon size={20} />
        </span>
        <div className="flex-1">
          <h2 className="text-[17px] font-semibold tracking-tight">Delete everything</h2>
          <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-ink-2">
            Permanently deletes your profile, accounts, categories, every transaction and every API key. This can&apos;t be
            undone.
          </p>
          <form onSubmit={submitWith(formAction)} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start" noValidate>
            <Field label="Type DELETE to confirm" htmlFor="confirm-delete" error={state.fieldErrors?.confirm} className="flex-1">
              <Input
                id="confirm-delete"
                name="confirm"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoComplete="off"
                aria-invalid={Boolean(state.fieldErrors?.confirm)}
              />
            </Field>
            <Button type="submit" variant="danger" disabled={pending || value !== "DELETE"} className="sm:mt-7">
              {pending ? "Deleting…" : "Delete my data"}
            </Button>
          </form>
          {state.message && !state.ok ? (
            <p role="alert" className="mt-3 text-sm text-expense">
              {state.message}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
