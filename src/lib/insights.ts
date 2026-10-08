import { toCents } from "./money";
import type { Category, CategoryTotal, Summary, Transaction } from "./types";

// Moving money between your own accounts (e.g. paying the credit card from
// debit) is stored as an expense + an income in this category. It isn't
// spending or earning, so every total below leaves it out.
export const TRANSFER_CATEGORY = "Transfers";
// Money that was already in an account when you started tracking. It sets
// the balance but isn't income (or spending, on a credit card).
export const OPENING_CATEGORY = "Opening balances";

export function isTransferCategory(name: string | null | undefined) {
  return (name ?? "").toLowerCase() === TRANSFER_CATEGORY.toLowerCase();
}

// Categories that move balances but stay out of income/expense totals
export function isSystemCategory(name: string | null | undefined) {
  const n = (name ?? "").toLowerCase();
  return n === TRANSFER_CATEGORY.toLowerCase() || n === OPENING_CATEGORY.toLowerCase();
}

export interface Totals {
  income: number; // cents
  expense: number; // cents
  net: number; // cents
  count: number;
  byCategory: CategoryTotal[];
  uncategorized: { expense: number; count: number };
}

export function totalsFromSummary(summary: Summary): Totals {
  let income = toCents(summary.income);
  let expense = toCents(summary.expense);
  let count = summary.transactionCount;
  const byCategory: CategoryTotal[] = [];
  const uncategorized = { expense: 0, count: 0 };

  for (const row of summary.byCategory) {
    if (isSystemCategory(row.name)) {
      if (row.type === "income") income -= toCents(row.total);
      else expense -= toCents(row.total);
      count -= row.count;
      continue;
    }
    if (row.categoryId === null) {
      uncategorized.count += row.count;
      if (row.type === "expense") uncategorized.expense += toCents(row.total);
    }
    byCategory.push(row);
  }

  return { income, expense, net: income - expense, count, byCategory, uncategorized };
}

// Subcategory totals rolled up into their top-level parent
export function rollUpCategories(rows: CategoryTotal[], categories: Category[], type: "income" | "expense") {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const groups = new Map<string, { id: string | null; name: string; total: number; count: number }>();

  for (const row of rows) {
    if (row.type !== type) continue;
    const category = row.categoryId ? byId.get(row.categoryId) : undefined;
    const top = category?.parentId ? byId.get(category.parentId) ?? category : category;
    const id = top?.id ?? null;
    const key = id ?? "none";
    const group = groups.get(key) ?? { id, name: top?.name ?? row.name ?? "Uncategorized", total: 0, count: 0 };
    group.total += toCents(row.total);
    group.count += row.count;
    groups.set(key, group);
  }

  return [...groups.values()].sort((a, b) => b.total - a.total);
}

// True for entries left out of reports: transfers and opening balances
export function isTransfer(tx: Transaction) {
  return isSystemCategory(tx.category?.name);
}

export function savingsRate(income: number, expense: number) {
  if (income <= 0) return null;
  return (income - expense) / income;
}

// "+12%" style change between two values; null when there's no baseline
export function change(current: number, previous: number) {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}
