// Adding up amounts that live in different currencies, for the totals the
// dashboard computes itself (the API's /summary already converts its own).
// Shared by server and client code.

import { convertCents, toCents, type Rates } from "./money";
import type { Account, Transaction } from "./types";

// An account's balance in the preferred currency, in cents: its own balance
// when the currencies match, else the API's conversion at today's rate.
// null when there's no rate right now.
export function balanceIn(account: Account, preferred: string) {
  if (account.currency === preferred) return toCents(account.balance);
  if (account.preferredBalance && account.preferredBalance.currency === preferred) {
    return toCents(account.preferredBalance.amount);
  }
  return null;
}

// Sum of account balances in the preferred currency
export function sumBalances(accounts: Account[], preferred: string) {
  let cents = 0;
  let approximate = false;
  let missing = 0;
  for (const account of accounts) {
    const value = balanceIn(account, preferred);
    if (value === null) missing += 1;
    else {
      cents += value;
      if (account.currency !== preferred) approximate = true;
    }
  }
  return { cents, approximate, missing };
}

// A transaction's amount in the preferred currency, in cents. Its amount is
// in its account's currency; `currencyOf` maps account ids to currencies.
export function txCents(tx: Pick<Transaction, "amount" | "accountId">, currencyOf: Record<string, string>, preferred: string, rates: Rates) {
  const currency = currencyOf[tx.accountId] ?? preferred;
  const cents = toCents(tx.amount);
  return currency === preferred ? cents : convertCents(cents, currency, rates);
}
