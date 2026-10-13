"use server";

import { refresh } from "next/cache";

import { getI18n } from "@/i18n/server";
import { api } from "@/lib/api";
import type { ActionState } from "@/lib/types";

import { parseAmount, text, toActionState } from "./helpers";

// Chores (allowance mode): an owner/admin assigns one with a reward, the
// member marks it done, and approving it pays the reward as income.
export async function createChore(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const accountId = text(formData, "accountId");
  const title = text(formData, "title");
  const reward = parseAmount(text(formData, "amount"));
  const assignedToId = text(formData, "assignedToId");
  const { t } = await getI18n();
  const fieldErrors: Record<string, string> = {};
  if (!title) fieldErrors.title = t.chores.titleRequired;
  if (!reward) fieldErrors.amount = t.common.amountRequired;
  if (!assignedToId) fieldErrors.assignedToId = t.chores.whoRequired;
  if (Object.keys(fieldErrors).length) return { ok: false, message: t.common.checkFields, fieldErrors };
  try {
    await api(`/accounts/${accountId}/chores`, { method: "POST", body: { title, reward, assignedToId } });
    refresh();
    return { ok: true, message: t.chores.created };
  } catch (error) {
    return toActionState(error);
  }
}

export async function choreAction(id: string, action: "complete" | "approve" | "reject" | "delete"): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    if (action === "delete") await api(`/chores/${id}`, { method: "DELETE" });
    else await api(`/chores/${id}/${action}`, { method: "POST" });
    refresh();
    return { ok: true, message: t.chores.done[action] };
  } catch (error) {
    return toActionState(error);
  }
}
