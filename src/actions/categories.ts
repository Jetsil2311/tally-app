"use server";

import { refresh } from "next/cache";

import { api } from "@/lib/api";
import type { ActionState, Category } from "@/lib/types";

import { text, toActionState } from "./helpers";

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id");
  const name = text(formData, "name");
  const parentId = text(formData, "parentId");

  if (!name) {
    return { ok: false, message: "Check the highlighted fields.", fieldErrors: { name: "Give the category a name." } };
  }

  try {
    if (id) {
      await api(`/categories/${id}`, { method: "PATCH", body: { name, parentId: parentId || null } });
    } else {
      await api("/categories", { method: "POST", body: { name, parentId: parentId || undefined } });
    }
    refresh();
    return { ok: true, message: id ? "Category updated" : "Category created" };
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteCategory(id: string): Promise<ActionState> {
  try {
    await api(`/categories/${id}`, { method: "DELETE" });
    refresh();
    return { ok: true, message: "Category deleted" };
  } catch (error) {
    return toActionState(error);
  }
}

// A sensible starting set, so new users can categorize from the first entry
const STARTER: { name: string; children?: string[] }[] = [
  { name: "Housing", children: ["Rent", "Utilities", "Internet"] },
  { name: "Food", children: ["Groceries", "Restaurants", "Coffee"] },
  { name: "Transport", children: ["Fuel", "Public transit", "Rideshare"] },
  { name: "Health" },
  { name: "Shopping" },
  { name: "Entertainment", children: ["Subscriptions"] },
  { name: "Bills & fees" },
  { name: "Education" },
  { name: "Travel" },
  { name: "Gifts" },
  { name: "Salary" },
  { name: "Freelance" },
  { name: "Other income" },
];

export async function createStarterCategories(): Promise<ActionState> {
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
    return { ok: true, message: "Starter categories added" };
  } catch (error) {
    return toActionState(error);
  }
}
