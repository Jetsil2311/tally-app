// Shapes returned by the finance-tracker API (see finance-tracker/API.md).
// Amounts arrive as strings so no precision is lost.

export type AccountType = "cash" | "debit" | "creditCard";
export type TransactionType = "income" | "expense";

export interface User {
  id: string;
  name: string | null;
  email: string;
  imageUrl: string | null;
  createdAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  isActive: boolean;
  balance: string;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Transaction {
  id: string;
  amount: string;
  type: TransactionType;
  date: string;
  description: string | null;
  source: string;
  createdAt: string;
  accountId: string;
  categoryId: string | null;
  account: { id: string; name: string };
  category: { id: string; name: string } | null;
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
  income: string;
  expense: string;
  net: string;
  transactionCount: number;
  byCategory: CategoryTotal[];
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
