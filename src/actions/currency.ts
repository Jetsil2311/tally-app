"use server";

import { getI18n } from "@/i18n/server";
import { api, ApiError } from "@/lib/api";
import { parseAmount } from "./helpers";

export interface Quote {
  rate: string;
  rateDate: string;
  stale: boolean;
  converted: string;
}

// What `amount` of `from` would be in `to` right now: the same rate the API
// uses when the entry is saved. For the "≈ 182.00 MXN" preview while typing.
export async function quoteConversion(from: string, to: string, rawAmount: string): Promise<{ quote?: Quote; error?: string }> {
  const amount = parseAmount(rawAmount) ?? "1";
  try {
    const quote = await api<Quote>("/exchange-rates", { query: { from, to, amount } });
    return { quote };
  } catch (error) {
    if (error instanceof ApiError) return { error: (await getI18n()).t.money.noRate };
    throw error;
  }
}
