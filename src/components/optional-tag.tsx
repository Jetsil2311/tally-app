"use client";

import { useI18n } from "@/i18n/client";

// "Optional" next to a field label, in the user's language
export function OptionalTag() {
  const { t } = useI18n();
  return <span className="text-xs font-normal text-ink-3">{t.common.optional}</span>;
}
