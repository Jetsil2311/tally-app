"use server";

import { refresh } from "next/cache";

import { getI18n } from "@/i18n/server";
import { api } from "@/lib/api";
import type { ActionState, ChatAnswer, Insight } from "@/lib/types";

import { text, toActionState } from "./helpers";

// AI-assisted features. The API computes every number; the AI only words
// answers and classifies merchants, and everything works without it.

// "Can I afford X?" or any question about this month. Never throws: the
// chat shows the error as a reply.
export async function askAssistant(message: string, accountId?: string): Promise<{ answer?: ChatAnswer; error?: string }> {
  const question = message.trim().slice(0, 1000);
  if (!question) return {};
  try {
    const answer = await api<ChatAnswer>("/chat", { method: "POST", body: { message: question, ...(accountId ? { accountId } : {}) } });
    return { answer };
  } catch (error) {
    const state = await toActionState(error);
    return { error: state.message };
  }
}

export async function dismissInsight(id: string): Promise<ActionState> {
  try {
    await api(`/insights/${id}/dismiss`, { method: "POST" });
    refresh();
    return { ok: true };
  } catch (error) {
    return toActionState(error);
  }
}

export async function markInsightsSeen(ids: string[] | "all"): Promise<ActionState> {
  try {
    if (ids === "all") await api("/insights/seen", { method: "POST" });
    else await Promise.all(ids.map((id) => api(`/insights/${id}/seen`, { method: "POST" })));
    refresh();
    return { ok: true };
  } catch (error) {
    return toActionState(error);
  }
}

// Runs the detectors now (normally a daily job does). Returns the new ones.
export async function generateInsights(mode: "weekly" | "monthly" = "weekly"): Promise<ActionState & { count?: number }> {
  const { t } = await getI18n();
  try {
    const created = await api<Insight[]>("/insights/generate", { method: "POST", body: { mode } });
    refresh();
    return { ok: true, count: created.length, message: created.length ? t.ai.newInsights(created.length) : t.ai.nothingNew };
  } catch (error) {
    return toActionState(error);
  }
}

// Monthly income (preferred currency; empty = estimate it) and savings goal (% of income)
export async function saveFinancialProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { t } = await getI18n();
  const incomeRaw = text(formData, "monthlyIncome").replace(/[^\d.,]/g, "").replace(/,(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const rateRaw = text(formData, "savingsRate");
  const income = incomeRaw ? Number(incomeRaw) : null;
  const rate = rateRaw ? Number(rateRaw) : null;

  const fieldErrors: Record<string, string> = {};
  if (incomeRaw && (!Number.isFinite(income) || income! <= 0)) fieldErrors.monthlyIncome = t.ai.incomeInvalid;
  if (rateRaw && (!Number.isInteger(rate) || rate! < 0 || rate! > 90)) fieldErrors.savingsRate = t.ai.rateInvalid;
  if (Object.keys(fieldErrors).length) return { ok: false, message: t.common.checkFields, fieldErrors };

  try {
    await api("/me", { method: "PATCH", body: { monthlyIncome: income, savingsRate: rate } });
    refresh();
    return { ok: true, message: t.ai.profileSaved };
  } catch (error) {
    return toActionState(error);
  }
}

// Accept the AI's suggested category (no categoryId) or pick another. Either
// way it becomes "manual" and the merchant is remembered for next time.
export async function confirmCategory(transactionId: string, categoryId?: string): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    await api(`/transactions/${transactionId}/confirm-category`, {
      method: "POST",
      body: categoryId ? { categoryId } : {},
    });
    refresh();
    return { ok: true, message: t.ai.categoryConfirmed };
  } catch (error) {
    return toActionState(error);
  }
}

// Retries entries the AI couldn't categorize yet (it was off or over quota)
export async function categorizePending(): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    const { attempted, categorized } = await api<{ attempted: number; categorized: number }>("/ai/categorize-pending", {
      method: "POST",
    });
    refresh();
    return { ok: true, message: t.ai.categorizedSome(categorized, attempted) };
  } catch (error) {
    return toActionState(error);
  }
}
