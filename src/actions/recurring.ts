"use server";

import { refresh } from "next/cache";

import { getI18n } from "@/i18n/server";
import { api } from "@/lib/api";
import type { ActionState, RecurringFrequency, RecurringPayment, TransactionType } from "@/lib/types";

import { parseAmount, text, toActionState } from "./helpers";

const FREQUENCIES: RecurringFrequency[] = ["weekly", "monthly", "yearly"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Create or edit a recurring payment from the sheet.
// On edit, schedule fields are only sent when they changed: the API
// recalculates the next due date whenever it receives one, which would
// undo a skipped occurrence.
export async function saveRecurring(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id");
  const name = text(formData, "name");
  const type = text(formData, "type") as TransactionType;
  const amount = parseAmount(text(formData, "amount"));
  const frequency = text(formData, "frequency") as RecurringFrequency;
  const interval = Number(text(formData, "interval") || "1");
  const startDate = text(formData, "startDate");
  const endDate = text(formData, "endDate");
  const accountId = text(formData, "accountId");
  const categoryId = text(formData, "categoryId");
  const description = text(formData, "description");
  // The currency it's charged in; on edit only sent when it changed
  const currency = text(formData, "currency");
  const originalCurrency = text(formData, "originalCurrency");
  const { t } = await getI18n();
  const r = t.recurring;

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = r.nameRequired;
  if (type !== "income" && type !== "expense") fieldErrors.type = r.typeRequired;
  if (!amount) fieldErrors.amount = t.common.amountRequired;
  if (!FREQUENCIES.includes(frequency)) fieldErrors.frequency = r.frequencyRequired;
  if (!Number.isInteger(interval) || interval < 1 || interval > 52) fieldErrors.interval = r.intervalInvalid;
  if (!DATE.test(startDate)) fieldErrors.startDate = r.startRequired;
  if (endDate && !DATE.test(endDate)) fieldErrors.endDate = r.endInvalid;
  if (endDate && DATE.test(startDate) && endDate < startDate) fieldErrors.endDate = r.endBeforeStart;
  if (!accountId) fieldErrors.accountId = r.accountRequired;
  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: t.common.checkFields, fieldErrors };
  }

  try {
    if (id) {
      const original = {
        frequency: text(formData, "originalFrequency"),
        interval: Number(text(formData, "originalInterval")),
        startDate: text(formData, "originalStartDate"),
        endDate: text(formData, "originalEndDate"),
      };
      await api(`/recurring-payments/${id}`, {
        method: "PATCH",
        body: {
          name,
          type,
          amount,
          accountId,
          categoryId: categoryId || null,
          description: description || null,
          ...(frequency !== original.frequency ? { frequency } : {}),
          ...(interval !== original.interval ? { interval } : {}),
          ...(startDate !== original.startDate ? { startDate } : {}),
          ...(endDate !== original.endDate ? { endDate: endDate || null } : {}),
          ...(currency && currency !== originalCurrency ? { currency } : {}),
        },
      });
    } else {
      await api<RecurringPayment>("/recurring-payments", {
        method: "POST",
        body: {
          name,
          type,
          amount,
          frequency,
          interval,
          startDate,
          accountId,
          ...(currency ? { currency } : {}),
          ...(endDate ? { endDate } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(description ? { description } : {}),
        },
      });
    }
    refresh();
    return { ok: true, message: id ? r.saved : type === "income" ? r.addedIncome : r.addedPayment };
  } catch (error) {
    return toActionState(error);
  }
}

// Pause stops future charges until resumed; resuming picks up from the next
// date on or after today, so the paused stretch is never charged.
export async function setRecurringActive(id: string, isActive: boolean): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    await api(`/recurring-payments/${id}`, { method: "PATCH", body: { isActive } });
    refresh();
    return { ok: true, message: isActive ? t.recurring.resumed : t.recurring.pausedMessage };
  } catch (error) {
    return toActionState(error);
  }
}

// Skip the next (or overdue) occurrence, e.g. when it was paid by hand
export async function skipRecurring(id: string): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    const payment = await api<RecurringPayment>(`/recurring-payments/${id}/skip`, { method: "POST" });
    refresh();
    return { ok: true, message: payment.isActive ? t.recurring.skipped : t.recurring.skippedLast };
  } catch (error) {
    return toActionState(error);
  }
}

// Entries already created stay in the ledger
export async function deleteRecurring(id: string): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    await api(`/recurring-payments/${id}`, { method: "DELETE" });
    refresh();
    return { ok: true, message: t.recurring.deletedMessage };
  } catch (error) {
    return toActionState(error);
  }
}

// Charge whatever is due now (e.g. right after topping up an account)
// instead of waiting for the hourly job
export async function processDue(): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    const { results } = await api<{ results: { name: string; status: string }[] }>("/recurring-payments/process", {
      method: "POST",
    });
    refresh();
    const paid = results.filter((r) => r.status === "paid").length;
    const failed = results.length - paid;
    if (results.length === 0) return { ok: true, message: t.recurring.nothingDueNow };
    if (failed === 0) return { ok: true, message: t.recurring.paidAll(paid) };
    return { ok: paid > 0, message: t.recurring.paidSome(paid, failed) };
  } catch (error) {
    return toActionState(error);
  }
}
