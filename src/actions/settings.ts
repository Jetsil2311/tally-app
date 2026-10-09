"use server";

import { refresh } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { LOCALE_CHOICE_COOKIE, LOCALE_COOKIE, detectLocale, isLanguage, languageOf, validLocale } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import { getI18n } from "@/i18n/server";
import { api } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/session";
import type { ActionState } from "@/lib/types";

import { text, toActionState } from "./helpers";

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

// "auto" goes back to detecting by region; "en" / "es" pin the language.
// The region part of the locale (number and date formats) is kept.
export async function setLanguage(choice: string): Promise<ActionState> {
  const store = await cookies();
  const year = 60 * 60 * 24 * 365;
  const current = validLocale(store.get(LOCALE_COOKIE)?.value);
  let locale: string;

  if (choice === "auto") {
    const request = await headers();
    locale = detectLocale({
      country: request.get("x-vercel-ip-country"),
      acceptLanguage: request.get("accept-language"),
    });
    store.delete(LOCALE_CHOICE_COOKIE);
  } else if (isLanguage(choice)) {
    const region = current?.split("-")[1];
    locale = validLocale(region ? `${choice}-${region}` : choice) ?? choice;
    store.set(LOCALE_CHOICE_COOKIE, choice, { path: "/", maxAge: year, sameSite: "lax" });
  } else {
    return { ok: false };
  }

  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: year, sameSite: "lax" });
  refresh();
  return { ok: true, message: dictionaries[languageOf(locale)].settings.languageSaved, data: { lang: languageOf(locale) } };
}

// Totals across accounts are shown in this currency, and new accounts
// default to it. Existing accounts and amounts aren't touched.
export async function setPreferredCurrency(code: string): Promise<ActionState> {
  try {
    await api("/me", { method: "PATCH", body: { preferredCurrency: code } });
    refresh();
    return { ok: true };
  } catch (error) {
    return toActionState(error);
  }
}

export async function createApiKey(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = text(formData, "name");
  const { t } = await getI18n();
  if (!name) {
    return { ok: false, message: t.common.checkFields, fieldErrors: { name: t.settings.keyNameRequired } };
  }
  try {
    const created = await api<{ key: string; name: string }>("/api-keys", { method: "POST", body: { name } });
    refresh();
    // The plain key is only available now; the API stores a hash
    return { ok: true, message: t.settings.keyCreated, data: { key: created.key, name: created.name } };
  } catch (error) {
    return toActionState(error);
  }
}

export async function revokeApiKey(id: string): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    await api(`/api-keys/${id}`, { method: "DELETE" });
    refresh();
    return { ok: true, message: t.settings.keyRevoked };
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteMyAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (text(formData, "confirm") !== "DELETE") {
    const { t } = await getI18n();
    return { ok: false, fieldErrors: { confirm: t.settings.typeDeleteError } };
  }
  try {
    await api("/me", { method: "DELETE" });
  } catch (error) {
    return toActionState(error);
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
