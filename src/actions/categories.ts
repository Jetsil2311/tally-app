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
  // Empty = a personal category; an account id = shared on that account
  // (owners and admins). The scope is fixed once created.
  const accountId = text(formData, "accountId");
  const { t } = await getI18n();

  if (!name) {
    return { ok: false, message: t.common.checkFields, fieldErrors: { name: t.categories.nameRequired } };
  }

  try {
    if (id) {
      await api(`/categories/${id}`, { method: "PATCH", body: { name, parentId: parentId || null } });
    } else {
      await api("/categories", {
        method: "POST",
        body: { name, parentId: parentId || undefined, accountId: accountId || undefined },
      });
    }
    refresh();
    return { ok: true, message: id ? t.categories.updated : t.categories.created };
  } catch (error) {
    return toActionState(error);
  }
}

// From the add sheet, without leaving it: creates a personal category (or a
// subcategory) and returns it so the entry being typed can use it right away
export async function createCategoryInline(
  name: string,
  parentId?: string,
): Promise<{ ok: true; category: Category } | { ok: false; message: string }> {
  const { t } = await getI18n();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: t.categories.nameRequired };
  try {
    const category = await api<Category>("/categories", {
      method: "POST",
      body: { name: trimmed, parentId: parentId || undefined },
    });
    refresh();
    return { ok: true, category };
  } catch (error) {
    return { ok: false, message: (await toActionState(error)).message ?? t.common.somethingWrong };
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
    // The starter set is personal: compare against personal categories only
    const existing = (await api<Category[]>("/categories")).filter((c) => c.accountId === null);
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
