"use server";

import { refresh } from "next/cache";

import { getI18n } from "@/i18n/server";
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
  // ISO 4217. Disabled selects aren't submitted, so empty = unchanged.
  const currency = text(formData, "currency").toUpperCase();
  // Credit cards: cutoff day, days to pay after it, credit limit. Empty
  // turns the cycle off (null) when editing.
  const statementDay = Number(text(formData, "statementDay")) || null;
  const paymentDueDays = Number(text(formData, "paymentDueDays")) || null;
  const creditLimitRaw = text(formData, "creditLimit");
  const creditLimit = creditLimitRaw ? parseAmount(creditLimitRaw) : null;
  const { t } = await getI18n();

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = t.accounts.nameRequired;
  if (!TYPES.includes(type)) fieldErrors.type = t.accounts.typeRequired;
  if (openingRaw && !opening) fieldErrors.opening = t.accounts.openingInvalid;
  if (creditLimitRaw && !creditLimit) fieldErrors.creditLimit = t.common.amountRequired;
  if (statementDay !== null && (statementDay < 1 || statementDay > 31)) fieldErrors.statementDay = t.accounts.cycle.dayInvalid;
  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: t.common.checkFields, fieldErrors };
  }

  // Only cards have a cycle; switching away from a card turns it off
  const card = type === "creditCard";
  const cycle = card
    ? { statementDay, paymentDueDays: statementDay ? paymentDueDays : null, creditLimit }
    : { statementDay: null, paymentDueDays: null, creditLimit: null };

  try {
    if (id) {
      await api(`/accounts/${id}`, { method: "PATCH", body: { name, type, ...(currency ? { currency } : {}), ...cycle } });
    } else {
      const account = await api<Account>("/accounts", {
        method: "POST",
        body: {
          name,
          type,
          ...(currency ? { currency } : {}),
          // POST doesn't take nulls
          ...(card && cycle.statementDay ? { statementDay: cycle.statementDay } : {}),
          ...(card && cycle.paymentDueDays ? { paymentDueDays: cycle.paymentDueDays } : {}),
          ...(card && cycle.creditLimit ? { creditLimit: cycle.creditLimit } : {}),
        },
      });
      // What's already there today, so the balance starts out right.
      // On a credit card it's what you owe, so it counts as an expense.
      if (opening) {
        const categories = await api<Category[]>("/categories");
        const category =
          categories.find(
            (c) => !c.parentId && c.accountId === null && isSystemCategory(c.name) && c.name.toLowerCase() === OPENING_CATEGORY.toLowerCase(),
          ) ??
          (await api<Category>("/categories", { method: "POST", body: { name: OPENING_CATEGORY } }));
        await api("/transactions", {
          method: "POST",
          body: {
            amount: opening,
            type: type === "creditCard" ? "expense" : "income",
            accountId: account.id,
            categoryId: category.id,
            description: t.accounts.openingDescription,
            source: "opening",
          },
        });
      }
    }
    refresh();
    return { ok: true, message: id ? t.accounts.updated : t.accounts.created };
  } catch (error) {
    return toActionState(error);
  }
}

export async function setAccountActive(id: string, isActive: boolean): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    if (isActive) {
      await api(`/accounts/${id}`, { method: "PATCH", body: { isActive: true } });
    } else {
      await api(`/accounts/${id}`, { method: "DELETE" });
    }
    refresh();
    return { ok: true, message: isActive ? t.accounts.restored : t.accounts.archivedMessage };
  } catch (error) {
    return toActionState(error);
  }
}
