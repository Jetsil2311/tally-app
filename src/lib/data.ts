import "server-only";
import { cache } from "react";
import { cacheLife } from "next/cache";

import { api } from "./api";
import { monthKeyOf, monthRange } from "./dates";
import type { Account, ApiKey, Category, Summary, Transaction, TransactionPage, TransactionType, User } from "./types";

// Data Access Layer: the only place pages read from the API.
// Reads are per-request (wrapped in React `cache` to dedupe within a render)
// and never shared between users. A finance view must show fresh numbers
// right after a change, so only the profile gets a client-side lifetime.

export async function getCurrentUser(): Promise<User> {
  "use cache: private";
  cacheLife({ stale: 300 });
  return api<User>("/me");
}

export const getAccounts = cache(async (includeInactive = false) => {
  return api<Account[]>("/accounts", { query: { includeInactive: includeInactive || undefined } });
});

export const getCategories = cache(async () => {
  const categories = await api<Category[]>("/categories");
  return categories.sort((a, b) => a.name.localeCompare(b.name));
});

export interface TransactionFilters {
  from?: string;
  to?: string;
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  search?: string;
}

export async function getTransactionPage(filters: TransactionFilters & { limit?: number; cursor?: string }) {
  return api<TransactionPage>("/transactions", { query: { ...filters } });
}

// Follows the cursor until `max` rows; used for month views that need every row
export async function getAllTransactions(filters: TransactionFilters, max = 1000) {
  const rows: Transaction[] = [];
  let cursor: string | undefined;
  do {
    const page = await getTransactionPage({ ...filters, limit: 200, cursor });
    rows.push(...page.data);
    cursor = page.nextCursor ?? undefined;
  } while (cursor && rows.length < max);
  return { rows, truncated: Boolean(cursor) };
}

export const getSummary = cache(async (from?: string, to?: string, accountId?: string) => {
  return api<Summary>("/summary", { query: { from, to, accountId } });
});

// One summary per month of the year, fetched in parallel
export async function getYearSeries(year: number, timeZone: string) {
  return Promise.all(
    Array.from({ length: 12 }, (_, month) => {
      const key = monthKeyOf(year, month);
      const { from, to } = monthRange(key, timeZone);
      return getSummary(from, to).then((summary) => ({ key, summary }));
    }),
  );
}

// The last `count` months ending at `endKey`, oldest first
export async function getMonthSeries(endKey: string, count: number, timeZone: string) {
  const [year, month] = endKey.split("-").map(Number);
  return Promise.all(
    Array.from({ length: count }, (_, i) => {
      const key = monthKeyOf(year, month - 1 - (count - 1 - i));
      const { from, to } = monthRange(key, timeZone);
      return getSummary(from, to).then((summary) => ({ key, summary }));
    }),
  );
}

export async function getApiKeys() {
  return api<ApiKey[]>("/api-keys");
}
