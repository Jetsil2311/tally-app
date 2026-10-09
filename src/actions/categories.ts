"use server";

import { refresh } from "next/cache";

import { getI18n } from "@/i18n/server";
import { api } from "@/lib/api";
import type { ActionState, Category } from "@/lib/types";

import { text, toActionState } from "./helpers";

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id");
  const name = text(formData, "name");
  const parentId = text(formData, "parentId");
  const { t } = await getI18n();

  if (!name) {
    return { ok: false, message: t.common.checkFields, fieldErrors: { name: t.categories.nameRequired } };
  }

  try {
    if (id) {
      await api(`/categories/${id}`, { method: "PATCH", body: { name, parentId: parentId || null } });
    } else {
      await api("/categories", { method: "POST", body: { name, parentId: parentId || undefined } });
    }
    refresh();
    return { ok: true, message: id ? t.categories.updated : t.categories.created };
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteCategory(id: string): Promise<ActionState> {
  const { t } = await getI18n();
  try {
    await api(`/categories/${id}`, { method: "DELETE" });
    refresh();
    return { ok: true, message: t.categories.deleted };
  } catch (error) {
    return toActionState(error);
  }
}

// A sensible starting set, so new users can categorize from the first
// entry. Names come from the dictionary, in the user's language.
export async function createStarterCategories(): Promise<ActionState> {
  const { t } = await getI18n();
  const STARTER = t.categories.starter;
  try {
    const existing = await api<Category[]>("/categories");
    const names = new Set(existing.map((c) => c.name.toLowerCase()));
    for (const group of STARTER) {
      let parent = existing.find((c) => c.name.toLowerCase() === group.name.toLowerCase() && !c.parentId);
      if (!parent) {
        parent = await api<Category>("/categories", { method: "POST", body: { name: group.name } });
      }
      for (const child of group.children ?? []) {
        if (names.has(child.toLowerCase())) continue;
        await api("/categories", { method: "POST", body: { name: child, parentId: parent.id } });
      }
    }
    refresh();
    return { ok: true, message: t.categories.starterAdded };
  } catch (error) {
    return toActionState(error);
  }
}
