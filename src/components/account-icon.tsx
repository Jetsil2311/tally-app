import type { IconProps } from "@phosphor-icons/react";
import { Bank, CreditCard, Wallet } from "@phosphor-icons/react/dist/ssr";

import type { AccountType } from "@/lib/types";

// Labels and hints live in the dictionary (t.accountTypes[type])
export const ACCOUNT_TYPES: AccountType[] = ["cash", "debit", "creditCard"];

export function AccountIcon({ type, ...props }: { type: AccountType } & IconProps) {
  if (type === "cash") return <Wallet {...props} />;
  if (type === "debit") return <Bank {...props} />;
  return <CreditCard {...props} />;
}
