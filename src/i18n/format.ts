// Small locale helpers shared by server and client code

// "octubre de 2026" -> "Octubre de 2026" for headings. Spanish keeps month
// names lowercase mid-sentence, so only standalone labels use this.
export function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

// Monday-first narrow weekday initials: M T W T F S S / L M X J V S D
export function weekdayInitials(locale: string) {
  const format = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
  // 2024-01-01 was a Monday
  return Array.from({ length: 7 }, (_, i) => format.format(new Date(Date.UTC(2024, 0, 1 + i))));
}
