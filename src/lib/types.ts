// Shapes returned by the finance-tracker API (see finance-tracker/API.md).
// Amounts arrive as strings so no precision is lost.

export type AccountType = "cash" | "debit" | "creditCard";
export type TransactionType = "income" | "expense";
// approved counts toward balances; pending waits for an owner/admin (a
// dependent's entry); unverified is a recurring charge waiting for someone to
// confirm it really happened; rejected never counts
export type TransactionStatus = "approved" | "pending" | "rejected" | "unverified";
export type MemberRole = "owner" | "admin" | "member" | "viewer" | "dependent";

export interface User {
  id: string;
  name: string | null;
  email: string;
  imageUrl: string | null;
  createdAt: string;
  // ISO 4217. Default for new accounts, and what totals across accounts are shown in
  preferredCurrency: string;
  // A managed profile (e.g. a child) created by a guardian
  isManaged: boolean;
  managedById: string | null;
  managedBy: { id: string; name: string | null; email: string } | null;
}

// Another user as the API shows them to you
export interface Person {
  id: string;
  name: string | null;
  email?: string | null;
  imageUrl: string | null;
}

// A conversion at a given exchange rate. stale = the provider was down and
// the last known rate was used.
export interface ExchangeRate {
  rate: string;
  rateDate: string;
  stale: boolean;
}

export interface ConvertedAmount extends ExchangeRate {
  currency: string;
  amount: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  isActive: boolean;
  // ISO 4217. The balance and every transaction amount on it are in this currency
  currency: string;
  // Verified only: unverified recurring charges don't count yet
  balance: string;
  // Recurring charges waiting to be confirmed, in the account's currency
  unverified: { income: string; expense: string; count: number };
  // As if every unverified charge were confirmed as is
  projectedBalance: string;
  // The balance in your preferred currency at today's rate; null when no rate is available
  preferredBalance: ConvertedAmount | null;
  // Your role on it; accounts are shared between members
  myRole: MemberRole;
  memberCount: number;
}

export interface Member {
  id: string;
  accountId: string;
  userId: string;
  role: MemberRole;
  // invited = hasn't accepted yet
  status: "active" | "invited";
  spendingLimit: string | null;
  requiresApproval: boolean;
  joinedAt: string | null;
  createdAt: string;
  user: Person & { managedById: string | null };
  invitedBy: { id: string; name: string | null } | null;
}

// An invitation you received to join someone's account
export interface Invitation {
  id: string;
  accountId: string;
  role: MemberRole;
  spendingLimit: string | null;
  requiresApproval: boolean;
  createdAt: string;
  account: { id: string; name: string; type: AccountType };
  invitedBy: Person | null;
}

export interface Connection {
  id: string;
  status: "pending" | "accepted" | "blocked";
  // outgoing = you sent the request
  direction: "incoming" | "outgoing";
  user: Person;
  createdAt: string;
  respondedAt: string | null;
}

export interface ManagedProfile {
  id: string;
  name: string | null;
  email: string | null;
  imageUrl: string | null;
  createdAt: string;
  hasLogin: boolean;
  loginCodeExpiresAt: string | null;
  memberships: { role: MemberRole; status: "active" | "invited"; account: { id: string; name: string } }[];
}

export interface AuditEntry {
  id: string;
  action: string;
  payload: Record<string, unknown> | null;
  // null = done by the system, e.g. a recurring payment
  user: { id: string; name: string | null } | null;
  createdAt: string;
}

export interface AuditPage {
  data: AuditEntry[];
  nextCursor: string | null;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  // Set = shared by that account's members; null = personal (only yours)
  accountId: string | null;
}

export interface Transaction {
  id: string;
  // Always in the account's currency
  amount: string;
  // Set when it was charged in another currency: 1 originalCurrency = exchangeRate account currency
  originalAmount: string | null;
  originalCurrency: string | null;
  exchangeRate: string | null;
  type: TransactionType;
  date: string;
  description: string | null;
  source: string;
  status: TransactionStatus;
  createdAt: string;
  accountId: string;
  categoryId: string | null;
  account: { id: string; name: string };
  category: { id: string; name: string } | null;
  // null when the creator deleted their user
  createdBy: { id: string; name: string | null; imageUrl: string | null } | null;
}

export interface TransactionPage {
  data: Transaction[];
  nextCursor: string | null;
}

export interface CategoryTotal {
  categoryId: string | null;
  name: string | null;
  parentId: string | null;
  type: TransactionType;
  total: string;
  count: number;
}

export interface Summary {
  from: string | null;
  to: string | null;
  // Every total is in this currency (default: your preferred one)
  currency: string;
  // The rates each account currency was converted with
  rates: (ExchangeRate & { from: string; to: string })[];
  income: string;
  expense: string;
  net: string;
  transactionCount: number;
  byCategory: CategoryTotal[];
}

export type RecurringFrequency = "weekly" | "monthly" | "yearly";

// Will the account have the money on the due date? (see the API's forecast)
export type FundingStatus = "covered" | "insufficient" | "income" | "noCheck" | "accountInactive" | "rateUnavailable";

export interface Forecast {
  dueDate: string;
  // As charged
  amount: string;
  currency: string;
  // Converted at today's rate (null when no rate is available)
  accountAmount: string | null;
  accountCurrency: string;
  // The currencies differ: the real amount is known when it's charged
  estimated: boolean;
  // Due date passed but not paid yet (not enough money)
  overdue: boolean;
  status: FundingStatus;
  balanceBefore: string;
  balanceAfter: string;
  shortfall: string;
}

export interface RecurringPayment {
  id: string;
  name: string;
  description: string | null;
  // In `currency`, which may differ from the account's (converted at each charge)
  amount: string;
  currency: string;
  type: TransactionType;
  frequency: RecurringFrequency;
  interval: number;
  // Dates are UTC midnight: they name a calendar day, not an instant
  startDate: string;
  nextDueDate: string;
  endDate: string | null;
  isActive: boolean;
  lastAttemptAt: string | null;
  lastAttemptStatus: "paid" | "insufficientFunds" | "accountInactive" | "exchangeRateUnavailable" | null;
  // Its charges wait as "unverified" until someone confirms them (default true)
  requiresVerification: boolean;
  // How many of its charges are still waiting to be verified
  awaitingVerification: number;
  accountId: string;
  categoryId: string | null;
  account: { id: string; name: string; type: AccountType; isActive: boolean; currency: string };
  category: { id: string; name: string } | null;
  createdBy: { id: string; name: string | null } | null;
  next: Forecast | null;
}

export interface Occurrence extends Forecast {
  recurringPaymentId: string;
  name: string;
  type: TransactionType;
  account: { id: string; name: string };
  category: { id: string; name: string } | null;
}

export interface Upcoming {
  until: string;
  occurrences: Occurrence[];
  // Balances in each account's own currency
  accounts: { id: string; name: string; currency: string; currentBalance: string; projectedBalance: string; shortfall: string }[];
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

// Result shape every form-backed Server Action returns to useActionState
export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  // Extra payload, e.g. the id of what was created (for "Undo")
  data?: Record<string, string>;
};
