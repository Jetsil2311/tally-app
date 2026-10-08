// Activity filters live in the URL; shared by the page (server) and the filter bar (client).
export interface ActivityQuery {
  month: string; // "2026-10" or "all"
  q?: string;
  type?: "income" | "expense";
  account?: string;
  category?: string;
  filter?: "uncategorized";
}

export function activityHref(query: ActivityQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  return `/activity?${params.toString()}`;
}
