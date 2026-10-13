"use server";

import { refresh } from "next/cache";

import { getI18n } from "@/i18n/server";
import { api } from "@/lib/api";

import { toActionState } from "./helpers";

// CSV import from any bank's statement export. Re-importing the same file
// is safe: rows already there come back "skipped".
export async function importCsv(
  accountId: string,
  csv: string,
): Promise<{ ok: true; created: number; skipped: number; failed: number } | { ok: false; message: string }> {
  const { t } = await getI18n();
  if (!accountId || !csv.trim()) return { ok: false, message: t.common.checkFields };
  try {
    const { results } = await api<{ results: { status: "created" | "skipped"; reason?: string }[] }>("/transactions/import", {
      method: "POST",
      body: { csv, accountId },
    });
    refresh();
    const created = results.filter((r) => r.status === "created").length;
    const skipped = results.filter((r) => r.status === "skipped" && /duplicate/i.test(r.reason ?? "")).length;
    return { ok: true, created, skipped, failed: results.length - created - skipped };
  } catch (error) {
    return { ok: false, message: (await toActionState(error)).message ?? t.common.somethingWrong };
  }
}
