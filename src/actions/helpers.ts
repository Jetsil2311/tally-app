import "server-only";
import { unstable_rethrow } from "next/navigation";

import { ApiError } from "@/lib/api";
import type { ActionState } from "@/lib/types";

// Turns a thrown error into the state a form shows. API validation issues
// become per-field messages; Next.js redirects (e.g. expired session) pass through.
export function toActionState(error: unknown, fallback = "Something went wrong. Try again."): ActionState {
  unstable_rethrow(error);
  if (error instanceof ApiError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: error.message, fieldErrors };
  }
  return { ok: false, message: fallback };
}

export function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// "1,234.50" or "$12" -> "1234.50"; null when it isn't a positive amount
export function parseAmount(raw: string) {
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/,(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned) > 0 ? cleaned : null;
}
