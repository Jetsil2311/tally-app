// What each account role can do, mirroring the API's ROLES
// (finance-tracker/src/lib/permissions.ts). The API enforces all of this;
// the UI uses it to show only the controls that will work.

import type { MemberRole, Transaction } from "./types";

const ROLES = {
  addTransactions: ["owner", "admin", "member", "dependent"],
  // edit/delete any transaction, approve/reject, categories, recurring
  // payments, edit the account, invite, audit log
  manage: ["owner", "admin"],
  // roles, removing members, archive/restore the account
  own: ["owner"],
} as const satisfies Record<string, readonly MemberRole[]>;

const has = (role: MemberRole | null | undefined, list: readonly MemberRole[]) => Boolean(role && list.includes(role));

export const canAddTransactions = (role?: MemberRole | null) => has(role, ROLES.addTransactions);
export const canManage = (role?: MemberRole | null) => has(role, ROLES.manage);
export const isOwner = (role?: MemberRole | null) => has(role, ROLES.own);

// Roles an inviter may hand out: owners any, admins only these three.
// Managed profiles can never be owners or admins.
export function assignableRoles(myRole: MemberRole, targetIsManaged = false): MemberRole[] {
  const all: MemberRole[] = myRole === "owner" ? ["owner", "admin", "member", "viewer", "dependent"] : ["member", "viewer", "dependent"];
  return targetIsManaged ? all.filter((role) => role !== "owner" && role !== "admin") : all;
}

// Owners/admins edit anything; members edit what they created; dependents
// and viewers can't edit
export function canEditTransaction(role: MemberRole | null | undefined, tx: Pick<Transaction, "createdBy">, userId: string) {
  if (canManage(role)) return true;
  return role === "member" && tx.createdBy?.id === userId;
}

// Dependents may also delete their own entries that are still pending or were rejected
export function canDeleteTransaction(role: MemberRole | null | undefined, tx: Pick<Transaction, "createdBy" | "status">, userId: string) {
  if (canEditTransaction(role, tx, userId)) return true;
  return role === "dependent" && tx.createdBy?.id === userId && tx.status !== "approved";
}

export const canReview = (role: MemberRole | null | undefined, tx: Pick<Transaction, "status">) =>
  canManage(role) && tx.status === "pending";
