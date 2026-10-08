"use server";

import { refresh } from "next/cache";

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

  const fieldErrors: Record<string, string> = {};
  if (type !== "income" && type !== "expense") fieldErrors.type = "Choose income or expense.";
  if (!amount) fieldErrors.amount = "Enter an amount above zero, like 12.50.";
  if (!accountId) fieldErrors.accountId = "Pick the account this money moved through.";
  if (!date) fieldErrors.date = "Enter a valid date and time.";
  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors };
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
      message: id ? "Changes saved" : type === "income" ? "Income added" : "Expense added",
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
      message: "Transaction deleted",
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
    return { ok: true, message: "Restored" };
  } catch (error) {
    return toActionState(error);
  }
}

export async function undoCreate(id: string): Promise<ActionState> {
  try {
    await api(`/transactions/${id}`, { method: "DELETE" });
    refresh();
    return { ok: true, message: "Undone" };
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

  const fieldErrors: Record<string, string> = {};
  if (!fromAccountId) fieldErrors.fromAccountId = "Pick where the money leaves from.";
  if (!toAccountId) fieldErrors.toAccountId = "Pick where the money goes.";
  if (fromAccountId && fromAccountId === toAccountId) fieldErrors.toAccountId = "Choose two different accounts.";
  if (!amount) fieldErrors.amount = "Enter an amount above zero, like 12.50.";
  if (!date) fieldErrors.date = "Enter a valid date and time.";
  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors };
  }

  try {
    const categories = await api<Category[]>("/categories");
    const transfer =
      categories.find((c) => isTransferCategory(c.name) && !c.parentId) ??
      (await api<Category>("/categories", { method: "POST", body: { name: TRANSFER_CATEGORY } }));

    const accounts = await api<{ id: string; name: string }[]>("/accounts");
    const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? "account";
    const shared = { amount, categoryId: transfer.id, date: date!.toISOString(), source: "transfer" };

    await api("/transactions", {
      method: "POST",
      body: { ...shared, type: "expense", accountId: fromAccountId, description: note || `To ${nameOf(toAccountId)}` },
    });
    await api("/transactions", {
      method: "POST",
      body: { ...shared, type: "income", accountId: toAccountId, description: note || `From ${nameOf(fromAccountId)}` },
    });
    refresh();
    return { ok: true, message: "Transfer recorded" };
  } catch (error) {
    return toActionState(error);
  }
}
