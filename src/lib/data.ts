import "server-only";
import { cache } from "react";
import { cacheLife } from "next/cache";

import { api, ApiError } from "./api";
import { monthKeyOf, monthRange } from "./dates";
import type {
  Account,
  ApiKey,
  AuditPage,
  Category,
  Connection,
  Invitation,
  ManagedProfile,
  Member,
  RecurringPayment,
  Summary,
  Transaction,
  TransactionPage,
  TransactionStatus,
  TransactionType,
  Upcoming,
  User,
} from "./types";

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
  status?: TransactionStatus;
  accountId?: string;
  categoryId?: string;
  createdById?: string;
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

// Each payment comes with `next`, the funding forecast for its next occurrence
export const getRecurringPayments = cache(async (includeInactive = false) => {
  return api<RecurringPayment[]>("/recurring-payments", { query: { includeInactive: includeInactive || undefined } });
});

// Every occurrence in the next `days` days, plus each account's projected balance
export const getUpcoming = cache(async (days = 30) => {
  return api<Upcoming>("/recurring-payments/upcoming", { query: { days } });
});

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

// Connections in every state you can see: incoming/outgoing requests,
// accepted, and people you blocked
export const getConnections = cache(async () => {
  return api<Connection[]>("/connections");
});

// Invitations to join other people's accounts
export const getInvitations = cache(async () => {
  return api<Invitation[]>("/invitations");
});

// Members and pending invitations of one account
export const getMembers = cache(async (accountId: string) => {
  return api<Member[]>(`/accounts/${accountId}/members`);
});

export const getAccount = cache(async (accountId: string) => {
  return api<Account>(`/accounts/${accountId}`);
});

// Who did what on the account, newest first (owners and admins)
export async function getAuditLog(accountId: string, cursor?: string, limit = 30) {
  return api<AuditPage>(`/accounts/${accountId}/audit-log`, { query: { limit, cursor } });
}

export const getManagedProfiles = cache(async () => {
  return api<ManagedProfile[]>("/managed-profiles");
});

export async function getManagedProfileKeys(profileId: string) {
  return api<ApiKey[]>(`/managed-profiles/${profileId}/api-keys`);
}

// Pending entries across your accounts: the ones you can approve, and your
// own that are waiting
export const getPending = cache(async () => {
  return api<TransactionPage>("/transactions", { query: { status: "pending", limit: 100 } });
});

// Things waiting on you, for the badge in the user menu and Home.
// Managed profiles can't use connections or invitations (403): they count 0.
export const getAttention = cache(async () => {
  const optional = <T,>(promise: Promise<T>, empty: T) =>
    promise.catch((error) => {
      if (error instanceof ApiError) return empty;
      throw error;
    });
  const [invitations, connections, pending] = await Promise.all([
    optional(getInvitations(), []),
    optional(getConnections(), []),
    optional(getPending(), { data: [], nextCursor: null }),
  ]);
  const requests = connections.filter((c) => c.status === "pending" && c.direction === "incoming");
  return { invitations, requests, pending: pending.data };
});

// Everyone on your shared accounts (active members), for "added by" filters
export const getSharedPeople = cache(async () => {
  const accounts = await getAccounts(true);
  const shared = accounts.filter((a) => a.memberCount > 1);
  const lists = await Promise.all(shared.map((a) => getMembers(a.id).catch(() => [])));
  const people = new Map<string, Member["user"]>();
  for (const member of lists.flat()) {
    if (member.status === "active") people.set(member.userId, member.user);
  }
  return [...people.values()];
});
