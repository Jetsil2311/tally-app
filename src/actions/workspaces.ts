"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getI18n } from "@/i18n/server";
import { api } from "@/lib/api";
import { PERSONAL_WORKSPACE, WORKSPACE_COOKIE } from "@/lib/session";
import type { ActionState, PosSyncResult, Workspace } from "@/lib/types";

import { text, toActionState } from "./helpers";

const YEAR = 60 * 60 * 24 * 365;

async function enter(workspaceId: string) {
  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, { path: "/", maxAge: YEAR, sameSite: "lax", httpOnly: true });
}

// Like switching workspaces in Notion: every screen now shows that
// workspace's accounts and numbers. Lands on its home.
export async function switchWorkspace(workspaceId: string) {
  await enter(workspaceId || PERSONAL_WORKSPACE);
  redirect("/");
}

// A business workspace (with its first account), then straight into it to
// connect the POS
export async function createWorkspace(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = text(formData, "name");
  const icon = text(formData, "icon");
  const currency = text(formData, "currency").toUpperCase();
  const { t } = await getI18n();
  if (!name) {
    return { ok: false, message: t.common.checkFields, fieldErrors: { name: t.workspaces.nameRequired } };
  }
  let workspace: Workspace;
  try {
    workspace = await api<Workspace>("/workspaces", {
      method: "POST",
      body: { name, ...(icon ? { icon } : {}), ...(currency ? { currency } : {}) },
    });
  } catch (error) {
    return toActionState(error);
  }
  await enter(workspace.id);
  redirect("/business");
}

export async function updateWorkspace(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id");
  const name = text(formData, "name");
  const icon = text(formData, "icon");
  const { t } = await getI18n();
  if (!name) {
    return { ok: false, message: t.common.checkFields, fieldErrors: { name: t.workspaces.nameRequired } };
  }
  try {
    await api(`/workspaces/${id}`, { method: "PATCH", body: { name, icon: icon || null } });
    refresh();
    return { ok: true, message: t.workspaces.saved };
  } catch (error) {
    return toActionState(error);
  }
}

// Its accounts go back to personal; you go there too
export async function deleteWorkspace(id: string): Promise<ActionState> {
  try {
    await api(`/workspaces/${id}`, { method: "DELETE" });
  } catch (error) {
    return toActionState(error);
  }
  await enter(PERSONAL_WORKSPACE);
  redirect("/");
}

function syncMessage(result: PosSyncResult, t: Awaited<ReturnType<typeof getI18n>>["t"]) {
  const changes = result.created + result.updated + result.removed;
  return changes === 0 ? t.business.syncUpToDate : t.business.synced(result.created, result.updated, result.removed);
}

// Checks the key against the POS, saves it, and brings in the last 90 days
export async function connectPos(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const workspaceId = text(formData, "workspaceId");
  const url = text(formData, "url");
  const apiKey = text(formData, "apiKey");
  const accountId = text(formData, "accountId");
  const { t } = await getI18n();

  const fieldErrors: Record<string, string> = {};
  if (!url) fieldErrors.url = t.business.urlRequired;
  if (!apiKey) fieldErrors.apiKey = t.business.keyRequired;
  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: t.common.checkFields, fieldErrors };
  }

  try {
    await api(`/workspaces/${workspaceId}/pos`, { method: "PUT", body: { url, apiKey, ...(accountId ? { accountId } : {}) } });
  } catch (error) {
    return toActionState(error);
  }
  try {
    const result = await api<PosSyncResult>(`/workspaces/${workspaceId}/pos/sync`, { method: "POST", body: {} });
    refresh();
    return { ok: true, message: `${t.business.connected} ${syncMessage(result, t)}` };
  } catch (error) {
    // Connected, but the first import failed: the card shows why, and "Sync now" retries
    refresh();
    const state = await toActionState(error);
    return { ok: true, message: `${t.business.connected} ${state.message ?? ""}`.trim() };
  }
}

export async function syncPos(workspaceId: string): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    const result = await api<PosSyncResult>(`/workspaces/${workspaceId}/pos/sync`, { method: "POST", body: {} });
    refresh();
    return { ok: true, message: syncMessage(result, t) };
  } catch (error) {
    refresh();
    return toActionState(error);
  }
}

export async function setPosAccount(workspaceId: string, accountId: string): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    await api(`/workspaces/${workspaceId}/pos`, { method: "PATCH", body: { accountId } });
    refresh();
    return { ok: true, message: t.business.accountChanged };
  } catch (error) {
    return toActionState(error);
  }
}

// Synced entries stay
export async function disconnectPos(workspaceId: string): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    await api(`/workspaces/${workspaceId}/pos`, { method: "DELETE" });
    refresh();
    return { ok: true, message: t.business.disconnected };
  } catch (error) {
    return toActionState(error);
  }
}
