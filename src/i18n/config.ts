// Which language Tally speaks, decided by region.
//
// Tally ships English and Spanish. A visitor gets Spanish when they're in a
// Spanish-speaking country (Vercel's geolocation header) or their browser's
// first language is Spanish; everyone else gets English. For any other
// language the page is served in English with lang="en" and nothing blocks
// translation, so the browser's built-in Google Translate can take over.
//
// The choice is stored as a BCP 47 tag in the `ft_locale` cookie, e.g.
// "es-MX". The language picks the dictionary; the region shapes number and
// date formats (es-ES writes "1.234,50 €", es-MX writes "$1,234.50").

export const LANGUAGES = ["en", "es"] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "en";

export const LOCALE_COOKIE = "ft_locale";
// Set when the visitor picked a language in Settings, so region detection
// never overrides an explicit choice
export const LOCALE_CHOICE_COOKIE = "ft_locale_choice";

// ISO 3166 codes of countries where Spanish is the main language
const SPANISH_COUNTRIES = new Set([
  "AR", "BO", "CL", "CO", "CR", "CU", "DO", "EC", "ES", "GQ", "GT",
  "HN", "MX", "NI", "PA", "PE", "PR", "PY", "SV", "UY", "VE",
]);

export function isLanguage(value: string | undefined | null): value is Language {
  return LANGUAGES.includes(value as Language);
}

// "es-MX" -> "es"; anything unsupported -> "en"
export function languageOf(locale: string | undefined | null): Language {
  const lang = (locale ?? "").split("-")[0].toLowerCase();
  return isLanguage(lang) ? lang : DEFAULT_LANGUAGE;
}

// A cookie value we can trust: a valid tag whose language we ship
export function validLocale(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const [canonical] = Intl.getCanonicalLocales(value);
    return canonical && isLanguage(canonical.split("-")[0]) ? canonical : null;
  } catch {
    return null;
  }
}

// Languages from an Accept-Language header, most preferred first:
// "es-MX,es;q=0.9,en;q=0.8" -> ["es-MX", "es", "en"]
function acceptedLanguages(header: string | null) {
  return (header ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((entry) => entry.tag && entry.tag !== "*" && !Number.isNaN(entry.q))
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag);
}

// Picks the locale for a first visit from the request's region and browser
// languages. `country` is Vercel's x-vercel-ip-country (absent in local dev).
export function detectLocale({ country, acceptLanguage }: { country: string | null; acceptLanguage: string | null }) {
  const region = country && /^[A-Z]{2}$/i.test(country) ? country.toUpperCase() : null;
  const browser = acceptedLanguages(acceptLanguage);
  const firstLanguage = browser[0]?.split("-")[0].toLowerCase();

  const language: Language = (region && SPANISH_COUNTRIES.has(region)) || firstLanguage === "es" ? "es" : "en";

  // Region for formats: the visitor's country, else the region in their
  // browser tag for this language (es-419, en-GB), else none
  const browserRegion = browser
    .find((tag) => tag.toLowerCase().startsWith(`${language}-`))
    ?.split("-")[1];
  const formatRegion = region ?? browserRegion;
  return validLocale(formatRegion ? `${language}-${formatRegion}` : language) ?? language;
}
