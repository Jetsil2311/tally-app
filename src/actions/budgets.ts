"use server";

import { refresh } from "next/cache";

import { getI18n } from "@/i18n/server";
import { api } from "@/lib/api";
import type { ActionState } from "@/lib/types";

import { parseAmount, text, toActionState } from "./helpers";

// Monthly spending limits: per category or overall, personal or on an
// account (owners/admins). Figures are recomputed by the API on every read.
export async function saveBudget(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id");
  const amount = parseAmount(text(formData, "amount"));
  const categoryId = text(formData, "categoryId");
  const accountId = text(formData, "accountId");
  const currency = text(formData, "currency");
  const rollover = formData.get("rollover") === "on";
  const { t } = await getI18n();
  if (!amount) return { ok: false, message: t.common.checkFields, fieldErrors: { amount: t.common.amountRequired } };

  try {
    if (id) {
      await api(`/budgets/${id}`, { method: "PATCH", body: { amount, rollover }, query: { accountId: accountId || undefined } });
    } else {
      await api("/budgets", {
        method: "POST",
        body: {
          amount,
          rollover,
          categoryId: categoryId || undefined,
          accountId: accountId || undefined,
          currency: currency || undefined,
        },
      });
    }
    refresh();
    return { ok: true, message: id ? t.budgets.updated : t.budgets.created };
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteBudget(id: string, accountId: string | null): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    await api(`/budgets/${id}`, { method: "DELETE", query: { accountId: accountId ?? undefined } });
    refresh();
    return { ok: true, message: t.budgets.deleted };
  } catch (error) {
    return toActionState(error);
  }
}
