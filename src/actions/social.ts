"use server";

import { refresh } from "next/cache";

import { getI18n } from "@/i18n/server";
import { api } from "@/lib/api";
import type { ActionState, Connection } from "@/lib/types";

import { text, toActionState } from "./helpers";

// Connections between users, and invitations to their accounts.
// A connection is required before you can invite someone to an account.

export async function sendConnection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = text(formData, "email");
  const { t } = await getI18n();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: t.common.checkFields, fieldErrors: { email: t.people.emailInvalid } };
  }
  try {
    const connection = await api<Connection>("/connections", { method: "POST", body: { email } });
    refresh();
    // If they had already asked you, sending one back connects you right away
    return { ok: true, message: connection.status === "accepted" ? t.people.connectedNow : t.people.requestSent };
  } catch (error) {
    return toActionState(error);
  }
}

type ConnectionAction = "accept" | "reject" | "block" | "remove";

export async function updateConnection(id: string, action: ConnectionAction): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    if (action === "remove") {
      await api(`/connections/${id}`, { method: "DELETE" });
    } else {
      await api(`/connections/${id}/${action}`, { method: "POST" });
    }
    refresh();
    return { ok: true, message: t.people.connectionDone[action] };
  } catch (error) {
    return toActionState(error);
  }
}

export async function respondToInvitation(accountId: string, accept: boolean): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    await api(`/invitations/${accountId}/${accept ? "accept" : "decline"}`, { method: "POST" });
    refresh();
    return { ok: true, message: accept ? t.people.invitationAccepted : t.people.invitationDeclined };
  } catch (error) {
    return toActionState(error);
  }
}
