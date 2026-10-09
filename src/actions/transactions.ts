"use server";

import { refresh } from "next/cache";

import { getI18n } from "@/i18n/server";
import { api } from "@/lib/api";
import { fromLocalInputValue } from "@/lib/dates";
import { TRANSFER_CATEGORY, isTransferCategory } from "@/lib/insights";
import { getPreferences } from "@/lib/session";
import type { ActionState, Category, Transaction, TransactionType } from "@/lib/types";

import { parseAmount, text, toActionState } from "./helpers";

// Create or edit a transaction from the quick-add sheet
export async function saveTransaction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id");
  const type = text(formData, "type") as TransactionType;
  const amount = parseAmount(text(formData, "amount"));
  const accountId = text(formData, "accountId");
  const categoryId = text(formData, "categoryId");
  const description = text(formData, "description");
  const { timeZone } = await getPreferences();
  const date = fromLocalInputValue(text(formData, "date"), timeZone);
  const { t } = await getI18n();

  const fieldErrors: Record<string, string> = {};
  if (type !== "income" && type !== "expense") fieldErrors.type = t.transactions.typeRequired;
  if (!amount) fieldErrors.amount = t.common.amountRequired;
  if (!accountId) fieldErrors.accountId = t.transactions.accountRequired;
  if (!date) fieldErrors.date = t.transactions.dateRequired;
  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: t.common.checkFields, fieldErrors };
  }

  const body = {
    amount,
    type,
    accountId,
    date: date!.toISOString(),
    categoryId: categoryId || null,
    description: description || null,
  };

  try {
    const saved = id
      ? await api<Transaction>(`/transactions/${id}`, { method: "PATCH", body })
      : await api<Transaction>("/transactions", {
          method: "POST",
          // POST doesn't accept nulls: leave empty fields out
          body: {
            ...body,
            categoryId: body.categoryId ?? undefined,
            description: body.description ?? undefined,
            source: "manual",
          },
        });
    refresh();
    return {
      ok: true,
      message: id ? t.transactions.saved : type === "income" ? t.transactions.incomeAdded : t.transactions.expenseAdded,
      data: { id: saved.id },
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteTransaction(id: string): Promise<ActionState> {
  try {
    const tx = await api<Transaction>(`/transactions/${id}`);
    await api(`/transactions/${id}`, { method: "DELETE" });
    refresh();
    // Returned so the client can offer "Undo"
    return {
      ok: true,
      message: (await getI18n()).t.quickAdd.deleted,
      data: {
        amount: tx.amount,
        type: tx.type,
        accountId: tx.accountId,
        categoryId: tx.categoryId ?? "",
        description: tx.description ?? "",
        date: tx.date,
      },
    };
  } catch (error) {
    return toActionState(error);
  }
}

// Re-creates a deleted transaction (Undo)
export async function restoreTransaction(data: Record<string, string>): Promise<ActionState> {
  try {
    await api("/transactions", {
      method: "POST",
      body: {
        amount: data.amount,
        type: data.type,
        accountId: data.accountId,
        categoryId: data.categoryId || undefined,
        description: data.description || undefined,
        date: data.date,
        source: "manual",
      },
    });
    refresh();
    return { ok: true, message: (await getI18n()).t.transactions.restored };
  } catch (error) {
    return toActionState(error);
  }
}

export async function undoCreate(id: string): Promise<ActionState> {
  try {
    await api(`/transactions/${id}`, { method: "DELETE" });
    refresh();
    return { ok: true, message: (await getI18n()).t.transactions.undone };
  } catch (error) {
    return toActionState(error);
  }
}

// Moving money between two of your accounts, e.g. paying the credit card
// from debit. Stored as an expense on one side and an income on the other,
// both in the "Transfers" category so reports can leave them out.
export async function createTransfer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fromAccountId = text(formData, "fromAccountId");
  const toAccountId = text(formData, "toAccountId");
  const amount = parseAmount(text(formData, "amount"));
  const note = text(formData, "description");
  const { timeZone } = await getPreferences();
  const date = fromLocalInputValue(text(formData, "date"), timeZone);
  const { t } = await getI18n();

  const fieldErrors: Record<string, string> = {};
  if (!fromAccountId) fieldErrors.fromAccountId = t.transactions.fromRequired;
  if (!toAccountId) fieldErrors.toAccountId = t.transactions.toRequired;
  if (fromAccountId && fromAccountId === toAccountId) fieldErrors.toAccountId = t.transactions.sameAccount;
  if (!amount) fieldErrors.amount = t.common.amountRequired;
  if (!date) fieldErrors.date = t.transactions.dateRequired;
  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: t.common.checkFields, fieldErrors };
  }

  try {
    const categories = await api<Category[]>("/categories");
    const transfer =
      categories.find((c) => isTransferCategory(c.name) && !c.parentId) ??
      (await api<Category>("/categories", { method: "POST", body: { name: TRANSFER_CATEGORY } }));

    const accounts = await api<{ id: string; name: string }[]>("/accounts");
    const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? t.transactions.someAccount;
    const shared = { amount, categoryId: transfer.id, date: date!.toISOString(), source: "transfer" };

    await api("/transactions", {
      method: "POST",
      body: { ...shared, type: "expense", accountId: fromAccountId, description: note || t.transactions.toAccount(nameOf(toAccountId)) },
    });
    await api("/transactions", {
      method: "POST",
      body: { ...shared, type: "income", accountId: toAccountId, description: note || t.transactions.fromAccount(nameOf(fromAccountId)) },
    });
    refresh();
    return { ok: true, message: t.transactions.transferRecorded };
  } catch (error) {
    return toActionState(error);
  }
}
