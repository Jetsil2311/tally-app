import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";

import { DEFAULT_LANGUAGE, LOCALE_COOKIE, languageOf, validLocale } from "./config";
import { dictionaries } from "./dictionaries";

// The visitor's locale and strings for this request, for Server Components
// and Server Actions. The proxy sets the cookie on the first visit, so it's
// only missing for requests the proxy skips (e.g. /auth/*).
export const getI18n = cache(async () => {
  const locale = validLocale((await cookies()).get(LOCALE_COOKIE)?.value) ?? DEFAULT_LANGUAGE;
  const lang = languageOf(locale);
  return { locale, lang, t: dictionaries[lang] };
});
