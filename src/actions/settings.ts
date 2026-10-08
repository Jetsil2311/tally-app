"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { api } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/session";
import type { ActionState } from "@/lib/types";

import { text, toActionState } from "./helpers";

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function createApiKey(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = text(formData, "name");
  if (!name) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors: { name: "Name the key, like “iPhone Shortcuts”." } };
  }
  try {
    const created = await api<{ key: string; name: string }>("/api-keys", { method: "POST", body: { name } });
    refresh();
    // The plain key is only available now; the API stores a hash
    return { ok: true, message: "Key created", data: { key: created.key, name: created.name } };
  } catch (error) {
    return toActionState(error);
  }
}

export async function revokeApiKey(id: string): Promise<ActionState> {
  try {
    await api(`/api-keys/${id}`, { method: "DELETE" });
    refresh();
    return { ok: true, message: "Key revoked" };
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteMyAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (text(formData, "confirm") !== "DELETE") {
    return { ok: false, fieldErrors: { confirm: "Type DELETE in capitals to confirm." } };
  }
  try {
    await api("/me", { method: "DELETE" });
  } catch (error) {
    return toActionState(error);
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
