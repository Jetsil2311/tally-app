import type { IconProps } from "@phosphor-icons/react";
import { Bank, CreditCard, Wallet } from "@phosphor-icons/react/dist/ssr";

import type { AccountType } from "@/lib/types";

export const ACCOUNT_TYPES: { value: AccountType; label: string; hint: string }[] = [
  { value: "cash", label: "Cash", hint: "Wallet, piggy bank, the envelope in the drawer" },
  { value: "debit", label: "Debit", hint: "Checking or savings, money that's yours" },
  { value: "creditCard", label: "Credit card", hint: "Borrowed money; the balance is what you owe" },
];

export function accountTypeLabel(type: AccountType) {
  return ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function AccountIcon({ type, ...props }: { type: AccountType } & IconProps) {
  if (type === "cash") return <Wallet {...props} />;
  if (type === "debit") return <Bank {...props} />;
  return <CreditCard {...props} />;
}
