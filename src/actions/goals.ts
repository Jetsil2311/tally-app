"use server";

import { refresh } from "next/cache";

import { getI18n } from "@/i18n/server";
import { api } from "@/lib/api";
import type { ActionState, GoalContribution, SavingsGoal } from "@/lib/types";

import { parseAmount, text, toActionState } from "./helpers";

// Savings goals: a target plus amounts set aside toward it. Nothing here
// moves money or touches an account's balance.

export async function saveGoal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id");
  const name = text(formData, "name");
  const target = parseAmount(text(formData, "amount"));
  const currency = text(formData, "currency");
  const icon = text(formData, "icon");
  const { t } = await getI18n();

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = t.goals.nameRequired;
  if (!target) fieldErrors.amount = t.common.amountRequired;
  if (Object.keys(fieldErrors).length) return { ok: false, message: t.common.checkFields, fieldErrors };

  try {
    if (id) {
      await api(`/goals/${id}`, { method: "PATCH", body: { name, targetAmount: target, icon: icon || null } });
    } else {
      await api<SavingsGoal>("/goals", {
        method: "POST",
        body: { name, targetAmount: target, currency: currency || undefined, icon: icon || undefined },
      });
    }
    refresh();
    return { ok: true, message: id ? t.goals.updated : t.goals.created };
  } catch (error) {
    return toActionState(error);
  }
}

// A deposit or a withdrawal. `data.completed` = "1" when this one just
// reached the target, so the sheet can celebrate it.
export async function addContribution(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "goalId");
  const kind = text(formData, "kind") === "withdraw" ? "withdraw" : "deposit";
  const amount = parseAmount(text(formData, "amount"));
  const note = text(formData, "note");
  const { t } = await getI18n();
  if (!amount) {
    return { ok: false, message: t.common.checkFields, fieldErrors: { amount: t.common.amountRequired } };
  }
  try {
    const result = await api<{ saved: string; completed: boolean }>(`/goals/${id}/contributions`, {
      method: "POST",
      body: { amount, kind, note: note || undefined },
    });
    refresh();
    return {
      ok: true,
      message: result.completed ? t.goals.reached : kind === "withdraw" ? t.goals.withdrawn : t.goals.deposited,
      data: { saved: result.saved, completed: result.completed ? "1" : "" },
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function setGoalStatus(id: string, status: "active" | "archived"): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    await api(`/goals/${id}`, { method: "PATCH", body: { status } });
    refresh();
    return { ok: true, message: status === "archived" ? t.goals.paused : t.goals.resumed };
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteGoal(id: string): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    await api(`/goals/${id}`, { method: "DELETE" });
    refresh();
    return { ok: true, message: t.goals.deleted };
  } catch (error) {
    return toActionState(error);
  }
}

// History for a goal's sheet, loaded when it opens
export async function loadContributions(id: string): Promise<GoalContribution[]> {
  try {
    return await api<GoalContribution[]>(`/goals/${id}/contributions`, { query: { limit: 50 } });
  } catch {
    return [];
  }
}
