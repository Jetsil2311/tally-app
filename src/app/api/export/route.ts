import { env } from "@/lib/env";
import { getToken } from "@/lib/session";

// CSV / PDF statement of the entries matching the Activity filters. The
// browser can't call the API with the session token (httpOnly cookie), so
// this passes the file through with the token added.
const PASS = ["format", "from", "to", "type", "status", "accountId", "categoryId", "createdById", "search", "tags"];

export async function GET(request: Request) {
  const token = await getToken();
  if (!token) return new Response("Not signed in", { status: 401 });
  const incoming = new URL(request.url).searchParams;
  const url = new URL(`${env.apiUrl}/transactions/export`);
  for (const key of PASS) {
    const value = incoming.get(key);
    if (value) url.searchParams.set(key, value);
  }
  const format = incoming.get("format") === "pdf" ? "pdf" : "csv";
  url.searchParams.set("format", format);

  const upstream = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  if (!upstream?.ok || !upstream.body) return new Response("Export failed", { status: upstream?.status ?? 503 });
  const day = new Date().toISOString().slice(0, 10);
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? (format === "pdf" ? "application/pdf" : "text/csv"),
      "Content-Disposition": `attachment; filename="tally-${day}.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}
