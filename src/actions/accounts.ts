"use server";

import { refresh } from "next/cache";

import { api } from "@/lib/api";
import { OPENING_CATEGORY, isSystemCategory } from "@/lib/insights";
import type { Account, AccountType, ActionState, Category } from "@/lib/types";

import { parseAmount, text, toActionState } from "./helpers";

const TYPES: AccountType[] = ["cash", "debit", "creditCard"];

export async function saveAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id");
  const name = text(formData, "name");
  const type = text(formData, "type") as AccountType;
  const openingRaw = text(formData, "opening");
  const opening = openingRaw ? parseAmount(openingRaw) : null;

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Give the account a name, like “Visa Gold” or “Wallet”.";
  if (!TYPES.includes(type)) fieldErrors.type = "Choose cash, debit or credit card.";
  if (openingRaw && !opening) fieldErrors.opening = "Enter a positive amount, or leave it empty.";
  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors };
  }

  try {
    if (id) {
      await api(`/accounts/${id}`, { method: "PATCH", body: { name, type } });
    } else {
      const account = await api<Account>("/accounts", { method: "POST", body: { name, type } });
      // What's already there today, so the balance starts out right.
      // On a credit card it's what you owe, so it counts as an expense.
      if (opening) {
        const categories = await api<Category[]>("/categories");
        const category =
          categories.find((c) => !c.parentId && isSystemCategory(c.name) && c.name.toLowerCase() === OPENING_CATEGORY.toLowerCase()) ??
          (await api<Category>("/categories", { method: "POST", body: { name: OPENING_CATEGORY } }));
        await api("/transactions", {
          method: "POST",
          body: {
            amount: opening,
            type: type === "creditCard" ? "expense" : "income",
            accountId: account.id,
            categoryId: category.id,
            description: "Opening balance",
            source: "opening",
          },
        });
      }
    }
    refresh();
    return { ok: true, message: id ? "Account updated" : "Account created" };
  } catch (error) {
    return toActionState(error);
  }
}

export async function setAccountActive(id: string, isActive: boolean): Promise<ActionState> {
  try {
    if (isActive) {
      await api(`/accounts/${id}`, { method: "PATCH", body: { isActive: true } });
    } else {
      await api(`/accounts/${id}`, { method: "DELETE" });
    }
    refresh();
    return { ok: true, message: isActive ? "Account restored" : "Account archived" };
  } catch (error) {
    return toActionState(error);
  }
}
