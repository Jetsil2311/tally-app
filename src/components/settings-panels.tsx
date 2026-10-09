"use client";

import { Check, Copy, Desktop, Key, Moon, Sun, Trash, WarningOctagon } from "@phosphor-icons/react";
import { useActionState, useState, useTransition } from "react";

import { createApiKey, deleteMyAccount, revokeApiKey, setLanguage } from "@/actions/settings";
import { useI18n } from "@/i18n/client";
import { currencyName, currencySymbol } from "@/lib/money";
import type { ActionState, ApiKey } from "@/lib/types";

import { Segmented } from "./chips";
import { usePreferences } from "./preferences";
import { setTheme, useTheme } from "./theme";
import { useToast } from "./toast";
import { Button, Card, Field, Input, Select, cn } from "./ui";
import { submitWith } from "./use-form-action";

// `language` is "auto" (detected by region) or a pinned "en" / "es"
export function AppearancePanel({ language }: { language: "auto" | "en" | "es" }) {
  const theme = useTheme();
  const { currency, setCurrency, currencies, savingCurrency } = usePreferences();
  const { t, locale } = useI18n();
  const toast = useToast();
  const [choice, setChoice] = useState(language);
  const [pending, startTransition] = useTransition();

  const changeLanguage = (value: string) => {
    setChoice(value as typeof language);
    startTransition(async () => {
      const result = await setLanguage(value);
      if (result.ok && result.data?.lang) document.documentElement.lang = result.data.lang;
      if (result.message) toast(result.message, { tone: result.ok ? "success" : "error" });
    });
  };

  return (
    <Card className="p-6">
      <h2 className="text-[17px] font-semibold tracking-tight">{t.settings.appearance}</h2>
      <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-medium">{t.settings.theme}</p>
          <Segmented
            label={t.settings.theme}
            value={theme}
            onChange={setTheme}
            className="w-full"
            options={[
              { value: "light", label: t.theme.light, icon: <Sun size={16} /> },
              { value: "dark", label: t.theme.dark, icon: <Moon size={16} /> },
              { value: "system", label: t.theme.auto, icon: <Desktop size={16} /> },
            ]}
          />
        </div>
        <Field label={t.settings.language} htmlFor="language" hint={t.settings.languageHint}>
          <Select id="language" value={choice} disabled={pending} onChange={(e) => changeLanguage(e.target.value)}>
            <option value="auto">{t.settings.languageAuto}</option>
            {/* Each language in its own name, so it's findable whatever is showing */}
            <option value="en" lang="en">
              English
            </option>
            <option value="es" lang="es">
              Español
            </option>
          </Select>
        </Field>
        <Field label={t.money.preferred} htmlFor="currency" hint={t.money.preferredHint} className="sm:col-span-2">
          <Select id="currency" value={currency} disabled={savingCurrency} onChange={(e) => setCurrency(e.target.value)}>
            {currencies.map((code) => (
              <option key={code} value={code}>
                {currencySymbol(code, locale)} {currencyName(code, locale)} ({code})
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
  const { t, locale } = useI18n();
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
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone });

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Key size={20} />
        </span>
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight">{t.settings.apiTitle}</h2>
          <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-ink-2">
            {t.settings.apiBody(
              <code translate="no" className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px]">
                /transactions
              </code>,
              <code translate="no" className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px]">
                X-API-Key
              </code>,
            )}
          </p>
        </div>
      </div>

      {created ? (
        <div className="rise mt-5 rounded-3xl border border-income/30 bg-income-soft p-4">
          <p className="text-sm font-medium">{t.settings.copyNow(created.name)}</p>
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
                toast(t.settings.keyCopied);
              }}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? t.settings.copied : t.settings.copy}
            </Button>
          </div>
        </div>
      ) : null}

      <form onSubmit={submitWith(formAction)} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start" noValidate>
        <Field label={t.settings.newKeyName} htmlFor="key-name" error={state.fieldErrors?.name} className="flex-1">
          <Input id="key-name" name="name" placeholder={t.settings.keyPlaceholder} autoComplete="off" aria-invalid={Boolean(state.fieldErrors?.name)} />
        </Field>
        <Button type="submit" disabled={pending} className="sm:mt-7">
          {pending ? t.settings.creating : t.settings.createKey}
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
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{apiKey.name}</p>
        <p className="truncate text-sm text-ink-2">
          <span translate="no" className="font-mono">
            {apiKey.prefix}…
          </span>
          {t.settings.keyMeta(format(apiKey.createdAt), apiKey.lastUsedAt ? format(apiKey.lastUsedAt) : null)}
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
            toast(result.message ?? t.settings.revoked, { tone: result.ok ? "success" : "error" });
          });
        }}
      >
        <Trash size={16} /> {confirming ? t.settings.confirm : t.settings.revoke}
      </Button>
    </li>
  );
}

export function DangerZone() {
  const [state, formAction, pending] = useActionState(deleteMyAccount, {});
  const { t } = useI18n();
  const [value, setValue] = useState("");
  return (
    <Card className="border-expense/30 p-6">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-expense-soft text-expense">
          <WarningOctagon size={20} />
        </span>
        <div className="flex-1">
          <h2 className="text-[17px] font-semibold tracking-tight">{t.settings.dangerTitle}</h2>
          <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-ink-2">{t.settings.dangerBody}</p>
          <form onSubmit={submitWith(formAction)} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start" noValidate>
            <Field label={t.settings.typeDelete} htmlFor="confirm-delete" error={state.fieldErrors?.confirm} className="flex-1">
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
              {pending ? t.common.deleting : t.settings.deleteMyData}
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
