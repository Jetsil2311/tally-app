"use client";

import { createContext, use, useMemo, type ReactNode } from "react";

import { DEFAULT_LANGUAGE, languageOf } from "./config";
import { dictionaries, type Dictionary } from "./dictionaries";
import type { Language } from "./config";

interface I18n {
  // BCP 47 tag for Intl formatting, e.g. "es-MX"
  locale: string;
  lang: Language;
  t: Dictionary;
}

const fallback: I18n = { locale: DEFAULT_LANGUAGE, lang: DEFAULT_LANGUAGE, t: dictionaries[DEFAULT_LANGUAGE] };
const I18nContext = createContext<I18n>(fallback);

// The server reads the locale cookie and passes it down, so the first
// client render matches the HTML
export function I18nProvider({ locale, children }: { locale: string; children: ReactNode }) {
  const value = useMemo(() => {
    const lang = languageOf(locale);
    return { locale, lang, t: dictionaries[lang] };
  }, [locale]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n() {
  return use(I18nContext);
}
