"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { getI18n } from "@/i18n/server";
import { api } from "@/lib/api";
import type { ActionState, AuditPage, MemberRole } from "@/lib/types";

import { parseAmount, text, toActionState } from "./helpers";

const ROLES: MemberRole[] = ["owner", "admin", "member", "viewer", "dependent"];

// Invites a connection (they must accept) or adds your own managed profile
// right away. Spending limit and approval only apply to dependents.
export async function inviteMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const accountId = text(formData, "accountId");
  const userId = text(formData, "userId");
  const role = text(formData, "role") as MemberRole;
  const limitRaw = text(formData, "spendingLimit");
  const spendingLimit = limitRaw ? parseAmount(limitRaw) : null;
  const requiresApproval = formData.get("requiresApproval") === "on";
  const { t } = await getI18n();

  const fieldErrors: Record<string, string> = {};
  if (!userId) fieldErrors.userId = t.members.pickPerson;
  if (!ROLES.includes(role)) fieldErrors.role = t.members.pickRole;
  if (role === "dependent" && limitRaw && !spendingLimit) fieldErrors.spendingLimit = t.members.limitInvalid;
  if (Object.keys(fieldErrors).length) return { ok: false, message: t.common.checkFields, fieldErrors };

  try {
    const member = await api<{ status: "active" | "invited" }>(`/accounts/${accountId}/members`, {
      method: "POST",
      body: {
        userId,
        role,
        ...(role === "dependent" ? { spendingLimit, requiresApproval } : {}),
      },
    });
    refresh();
    return { ok: true, message: member.status === "active" ? t.members.added : t.members.invited };
  } catch (error) {
    return toActionState(error);
  }
}

// Role (owners only) and a dependent's limits (owners and admins)
export async function updateMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const accountId = text(formData, "accountId");
  const userId = text(formData, "userId");
  const role = text(formData, "role") as MemberRole;
  const originalRole = text(formData, "originalRole");
  const limitRaw = text(formData, "spendingLimit");
  const spendingLimit = limitRaw ? parseAmount(limitRaw) : null;
  const requiresApproval = formData.get("requiresApproval") === "on";
  const { t } = await getI18n();

  if (!ROLES.includes(role)) return { ok: false, message: t.common.checkFields, fieldErrors: { role: t.members.pickRole } };
  if (role === "dependent" && limitRaw && !spendingLimit) {
    return { ok: false, message: t.common.checkFields, fieldErrors: { spendingLimit: t.members.limitInvalid } };
  }

  try {
    await api(`/accounts/${accountId}/members/${userId}`, {
      method: "PATCH",
      body: {
        // Sending an unchanged role as an admin would be refused
        ...(role !== originalRole ? { role } : {}),
        ...(role === "dependent" ? { spendingLimit, requiresApproval } : {}),
      },
    });
    refresh();
    return { ok: true, message: t.members.updated };
  } catch (error) {
    return toActionState(error);
  }
}

// Removes a member (owners) or cancels an invitation (owners and admins)
export async function removeMember(accountId: string, userId: string, invitation: boolean): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    await api(`/accounts/${accountId}/members/${userId}`, { method: "DELETE" });
    refresh();
    return { ok: true, message: invitation ? t.members.invitationCancelled : t.members.removed };
  } catch (error) {
    return toActionState(error);
  }
}

// You stop seeing the account; its history stays with the other members
export async function leaveAccount(accountId: string): Promise<ActionState> {
  try {
    await api(`/accounts/${accountId}/leave`, { method: "POST" });
  } catch (error) {
    return toActionState(error);
  }
  redirect("/accounts");
}

// Next page of the audit log ("Show older")
export async function loadAuditLog(accountId: string, cursor: string): Promise<AuditPage> {
  return api<AuditPage>(`/accounts/${accountId}/audit-log`, { query: { limit: 30, cursor } });
}
