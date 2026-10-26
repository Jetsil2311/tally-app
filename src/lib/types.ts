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
  // Credit cards with a billing cycle: cutoff day, days to pay after it, limit
  statementDay?: number | null;
  paymentDueDays?: number | null;
  creditLimit?: string | null;
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
  // Set = shared by that account's members; null = personal (only yours,
  // in the current workspace: each workspace has its own)
  accountId: string | null;
  // Type in the AI's categorization taxonomy, e.g. "restaurants"
  kind?: string | null;
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
  // Clean merchant name from automatic categorization ("Starbucks" for "STARBUCKS #1234 MEX")
  merchant?: string | null;
  // How the category was set; null when there was nothing to categorize
  categoryStatus?: CategoryStatus | null;
  tags?: string[];
  notes?: string | null;
  // Only its creator sees it; still counts in the balance, not in settlements
  isPrivate?: boolean;
}

// manual: a person; rule: a saved merchant rule; ai: the AI, confidently;
// review: the AI wasn't sure (categoryId holds its suggestion); pending:
// not categorized yet, retried later
export type CategoryStatus = "manual" | "rule" | "ai" | "review" | "pending";

// ---------------------------------------------------------------------------
// AI features. The numbers are always computed by the API's code; the AI only
// classifies merchants and words messages.
// ---------------------------------------------------------------------------

export interface AiStatus {
  enabled: boolean;
  // disabled: no API key; not_allowed: not in the allow list; quota_exceeded
  reason: "disabled" | "not_allowed" | "quota_exceeded" | null;
  used: number;
  limit: number;
  resetsAt: string;
  model: string;
}

export interface Insight {
  id: string;
  // insight = something noticed; suggestion = something to do
  kind: "insight" | "suggestion";
  // category_spike | category_rising | month_closed_negative |
  // negative_month_projection | subscription_review | savings_progress
  type: string;
  period: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  writtenBy: "template" | "ai";
  seenAt: string | null;
  createdAt: string;
}

export interface FinancialProfile {
  currency: string;
  // Set by the user; null = estimated from recorded income
  monthlyIncome: string | null;
  incomeSource: "profile" | "estimated" | "none";
  estimatedMonthlyIncome: string | null;
  // Savings goal, % of income (0-90)
  savingsRate: number | null;
  savingsTarget: string | null;
}

export type Verdict = "comfortable" | "tight" | "not_recommended" | "insufficient_data";

export interface ChatAnswer {
  answer: string;
  // null for a general question (no price in it)
  verdict: Verdict | null;
  // Every figure behind the answer, already formatted by the API
  analysis: Record<string, unknown> | null;
  disclaimer: string;
  // retried: the AI got a second try after quoting a figure it wasn't given
  ai: { used: boolean; reason: string | null; retried?: boolean };
  // Set when the assistant created something (newer APIs)
  action?: { type: string; id?: string } | null;
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
  // Set for an MSI / installment plan: that many monthly charges in total
  totalInstallments?: number | null;
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

export type BadgeCategory = "onboarding" | "accounts" | "transactions" | "recurring" | "social" | "ai" | "goals";

// A milestone (cosmetic). `name`/`description` come from the API in Spanish;
// the dashboard shows its own translation by `key` when it has one.
export interface Badge {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  earned: boolean;
  earnedAt: string | null;
}

export type GoalStatus = "active" | "completed" | "archived";

// A digital piggy bank: a target plus amounts set aside toward it. No money
// moves and no account balance changes.
export interface SavingsGoal {
  id: string;
  name: string;
  // One emoji, or null
  icon: string | null;
  targetAmount: string;
  saved: string;
  currency: string;
  // 0–100+, above 100 when more than the target was saved
  progress: number;
  status: GoalStatus;
  completedAt: string | null;
  createdAt: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  // Negative = a withdrawal
  amount: string;
  note: string | null;
  createdAt: string;
}

// A monthly spending limit, per category or overall (categoryId null);
// on an account (shared) or personal. Figures are for this month.
export interface Budget {
  id: string;
  accountId: string | null;
  categoryId: string | null;
  category: string | null;
  currency: string;
  rollover: boolean;
  // What was set; `limit` adds last month's leftover when rollover is on
  amount: string;
  limit: string;
  spent: string;
  remaining: string;
  progress: number;
  overBudget: boolean;
}

export interface CardCycle {
  statementDay: number;
  paymentDueDays: number;
  creditLimit: string | null;
  currency: string;
  cycleStart: string;
  cycleEnd: string;
  paymentDueDate: string;
  // Negative once the due date has passed
  daysUntilDue: number;
  spentThisCycle: string;
  paidThisCycle: string;
  balanceToPay: string;
}

export interface Installments {
  months: { month: string; committed: Record<string, string> }[];
  plans: {
    id: string;
    name: string;
    accountId: string;
    amount: string;
    currency: string;
    totalInstallments: number;
    nextDueDate: string;
    endDate: string | null;
  }[];
}

export interface Settlement {
  currency: string;
  totalShared: string;
  fairShare: string;
  entries: { userId: string; name: string | null; paid: string; balance: string }[];
  transfers: { fromUserId: string; fromName: string | null; toUserId: string; toName: string | null; amount: string }[];
}

export type ChoreStatus = "pending" | "done" | "approved" | "rejected";

export interface Chore {
  id: string;
  accountId: string;
  title: string;
  reward: string;
  status: ChoreStatus;
  assignedToId: string;
  assignedTo: { id: string; name: string | null };
  createdBy: { id: string; name: string | null } | null;
  completedAt: string | null;
  reviewedAt: string | null;
  transactionId: string | null;
  createdAt: string;
}

export interface ReceiptDraft {
  merchant: string | null;
  amount: string | number | null;
  date: string | null;
  categoryHint: string | null;
  confidence: "high" | "medium" | "low";
}

// Billing: one paid plan (Pro), through Stripe. Kept in sync by Stripe's
// webhook on the API; never a live Stripe call.
export interface Billing {
  plan: "free" | "pro";
  // Stripe's status: active, trialing, past_due, canceled...; null if never subscribed
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
}

// ---------------------------------------------------------------------------
// Workspaces (personal + business) and the business's point of sale
// ---------------------------------------------------------------------------

export type WorkspaceType = "personal" | "business";

export interface Workspace {
  // "personal" for the personal one
  id: string;
  type: WorkspaceType;
  // The personal one is named after you (null if your profile has no name)
  name: string | null;
  // An emoji, e.g. "☕"
  icon: string | null;
  currency: string;
  // Owner: rename/delete it, connect its POS. Member: shared one of its accounts with you.
  role: "owner" | "member";
  accountCount: number;
  pos: { connected: boolean; businessName: string | null; lastSyncAt: string | null; lastSyncStatus: "ok" | "error" | null };
}

export type PosConnection =
  | { connected: false }
  | {
      connected: true;
      baseUrl: string;
      // "bkpos_a1b2…"
      keyHint: string;
      businessName: string | null;
      currency: string | null;
      timeZone: string | null;
      // Where synced entries go; null if that account was deleted
      account: { id: string; name: string; currency: string } | null;
      lastSyncAt: string | null;
      lastSyncStatus: "ok" | "error" | null;
      lastSyncError: string | null;
    };

export interface PosSyncResult {
  from: string;
  to: string;
  created: number;
  updated: number;
  removed: number;
  skipped: number;
}

// The POS's own reports (bk-menu-app docs/POS_API.md). Money is a string with 2 decimals.
export interface PosSummary {
  from: string;
  to: string;
  currency: string;
  orders: number;
  daysWithSales: number;
  averageTicket: string;
  revenue: string;
  paidWith: { cash: string; card: string; rewards: string };
  ingredientCost: string;
  grossProfit: string;
  grossMarginPercent: number;
  fixedCosts: string;
  netProfit: string;
  revenueWithoutRecipe: string;
  cashFlow: { moneyIn: string; ingredientPurchases: string; fixedExpensesDue: string; net: string };
}

export interface PosDay {
  date: string;
  orders: number;
  revenue: string;
  ingredientCost: string;
  grossProfit: string;
  fixedCosts: string;
  netProfit: string;
}

export interface PosProduct {
  productId: string | null;
  name: string;
  quantitySold: number;
  revenue: string;
  // null when the product has no recipe yet (its cost is unknown)
  ingredientCost: string | null;
  grossProfit: string | null;
  marginPercent: number | null;
  hasRecipe: boolean;
}

export interface PosInventory {
  currency: string;
  totalValue: string;
  lowCount: number;
  items: {
    id: string;
    name: string;
    unit: string;
    inStock: number;
    costPerUnit: string;
    value: string;
    warnAt: number;
    status: "ok" | "low" | "out";
    supplier: string | null;
  }[];
}

export interface PosRegisterSession {
  date: string;
  status: "open" | "closed";
  openingCash: string;
  cashSales: string;
  cardSales: string;
  cashIn: string;
  cashOut: string;
  expectedCash: string;
  countedCash: string | null;
  // < 0: cash missing
  difference: string | null;
}

export interface PosExpense {
  id: string;
  name: string;
  amount: string;
  frequency: "weekly" | "monthly" | "annual";
  nextDueDate: string;
  equivalents: { daily: string; weekly: string; monthly: string; annual: string };
}

export interface PosList<T> {
  from?: string;
  to?: string;
  currency: string;
  data: T[];
}
