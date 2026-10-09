"use server";

import { refresh } from "next/cache";

import { getI18n } from "@/i18n/server";
import { api } from "@/lib/api";
import type { ActionState } from "@/lib/types";

import { text, toActionState } from "./helpers";

// Managed profiles: people you look after (e.g. children). They have no
// login unless you give them a one-time code, and can't own accounts.

export async function saveProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id");
  const name = text(formData, "name");
  const { t } = await getI18n();
  if (!name) return { ok: false, message: t.common.checkFields, fieldErrors: { name: t.profiles.nameRequired } };
  try {
    await api(id ? `/managed-profiles/${id}` : "/managed-profiles", { method: id ? "PATCH" : "POST", body: { name } });
    refresh();
    return { ok: true, message: id ? t.profiles.updated : t.profiles.created };
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteProfile(id: string): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    await api(`/managed-profiles/${id}`, { method: "DELETE" });
    refresh();
    return { ok: true, message: t.profiles.deleted };
  } catch (error) {
    return toActionState(error);
  }
}

// A one-time code (7 days) the person types on their first Google sign-in.
// Making a new one replaces the previous code.
export async function createLoginCode(id: string): Promise<ActionState> {
  try {
    const { code, expiresAt } = await api<{ code: string; expiresAt: string }>(`/managed-profiles/${id}/login-code`, {
      method: "POST",
    });
    refresh();
    return { ok: true, data: { code, expiresAt } };
  } catch (error) {
    return toActionState(error);
  }
}

// API keys that act as the profile, e.g. for a Shortcut on a child's iPad.
// Its role and spending limits apply.
export async function createProfileKey(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const profileId = text(formData, "profileId");
  const name = text(formData, "name");
  const { t } = await getI18n();
  if (!name) return { ok: false, message: t.common.checkFields, fieldErrors: { name: t.settings.keyNameRequired } };
  try {
    const created = await api<{ key: string; name: string }>(`/managed-profiles/${profileId}/api-keys`, {
      method: "POST",
      body: { name },
    });
    return { ok: true, data: { key: created.key, name: created.name } };
  } catch (error) {
    return toActionState(error);
  }
}

export async function revokeProfileKey(profileId: string, keyId: string): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    await api(`/managed-profiles/${profileId}/api-keys/${keyId}`, { method: "DELETE" });
    return { ok: true, message: t.settings.keyRevoked };
  } catch (error) {
    return toActionState(error);
  }
}

// The profile's keys, for the sheet that manages them
export async function listProfileKeys(profileId: string) {
  return api<{ id: string; name: string; prefix: string; createdAt: string; lastUsedAt: string | null }[]>(
    `/managed-profiles/${profileId}/api-keys`,
  );
}
