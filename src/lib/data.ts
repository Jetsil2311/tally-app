import "server-only";
import { cache } from "react";

import { api, ApiError } from "./api";
import { monthKeyOf, monthRange } from "./dates";
import type { Rates } from "./money";
import type {
  Account,
  AiStatus,
  ApiKey,
  AuditPage,
  Category,
  Connection,
  FinancialProfile,
  Insight,
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

// Per request: the preferred currency can change and every total depends on it
export const getCurrentUser = cache(async () => {
  const user = await api<User>("/me");
  // An API without the currency system yet: don't crash every page over it
  return { ...user, preferredCurrency: user.preferredCurrency ?? "USD" };
});

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

// Totals are in `currency`, default: the user's preferred currency
export const getSummary = cache(async (from?: string, to?: string, accountId?: string, currency?: string) => {
  return api<Summary>("/summary", { query: { from, to, accountId, currency } });
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

// Recurring charges waiting for someone to confirm they really happened
// Empty on an API without verification yet, instead of failing the page
export const getUnverified = cache(async (): Promise<TransactionPage> => {
  try {
    return await api<TransactionPage>("/transactions", { query: { status: "unverified", limit: 100 } });
  } catch (error) {
    if (error instanceof ApiError) return { data: [], nextCursor: null };
    throw error;
  }
});

// Things waiting on you, for the badge in the user menu and Home.
// Managed profiles can't use connections or invitations (403): they count 0.
export const getAttention = cache(async () => {
  const optional = <T,>(promise: Promise<T>, empty: T) =>
    promise.catch((error) => {
      if (error instanceof ApiError) return empty;
      throw error;
    });
  const [invitations, connections, pending, unverified] = await Promise.all([
    optional(getInvitations(), []),
    optional(getConnections(), []),
    optional(getPending(), { data: [], nextCursor: null }),
    optional(getUnverified(), { data: [], nextCursor: null }),
  ]);
  const requests = connections.filter((c) => c.status === "pending" && c.direction === "incoming");
  return { invitations, requests, pending: pending.data, unverified: unverified.data };
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

// ---------------------------------------------------------------------------
// Currencies
// ---------------------------------------------------------------------------

// Currencies the API can convert (null when the rate provider is down)
export const getCurrencies = cache(async () => {
  const { codes } = await api<{ provider: string; codes: string[] | null }>("/currencies");
  return codes;
});

// Today's rate from each currency into `to`, for adding up amounts that
// are in different currencies. Currencies without a rate are left out.
export const getRatesTo = cache(async (codes: string[], to: string) => {
  const rates: Rates = { [to]: 1 };
  await Promise.all(
    [...new Set(codes)]
      .filter((code) => code !== to)
      .map(async (from) => {
        try {
          const { rate } = await api<{ rate: string }>("/exchange-rates", { query: { from, to } });
          rates[from] = Number(rate);
        } catch (error) {
          if (!(error instanceof ApiError)) throw error;
        }
      }),
  );
  return rates;
});

// ---------------------------------------------------------------------------
// AI. Every reader is optional: an API without AI (or with it off) must
// never break a page.
// ---------------------------------------------------------------------------

async function optional<T>(promise: Promise<T>, empty: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError) return empty;
    throw error;
  }
}

// Whether AI is on for you, and your usage this month
export const getAiStatus = cache(async () => optional<AiStatus | null>(api<AiStatus>("/ai/status"), null));

// Newest first, without dismissed ones
export const getInsights = cache(async (limit = 30) =>
  optional<Insight[]>(api<Insight[]>("/insights", { query: { limit } }), []),
);

export const getFinancialProfile = cache(async () =>
  optional<FinancialProfile | null>(api<FinancialProfile>("/me/financial-profile"), null),
);

// Transactions whose category the AI wasn't sure about ("review"), or that
// are still waiting to be categorized ("pending")
export const getToReview = cache(async () => {
  const [review, pending] = await Promise.all([
    optional<TransactionPage>(api<TransactionPage>("/transactions", { query: { categoryStatus: "review", limit: 100 } }), { data: [], nextCursor: null }),
    optional<TransactionPage>(api<TransactionPage>("/transactions", { query: { categoryStatus: "pending", limit: 100 } }), { data: [], nextCursor: null }),
  ]);
  return { review: review.data, pending: pending.data };
});
