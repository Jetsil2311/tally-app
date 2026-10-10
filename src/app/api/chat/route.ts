import { getI18n } from "@/i18n/server";
import { env } from "@/lib/env";
import { getToken } from "@/lib/session";

// The assistant's answers, streamed. The browser can't call the API itself
// (the session token is an httpOnly cookie), so this passes the API's
// Server-Sent Events straight through with the token added. An API without
// streaming answers with plain JSON, which is passed through as is too.
export async function POST(request: Request) {
  const token = await getToken();
  if (!token) return Response.json({ message: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.message !== "string" || !body.message.trim()) {
    return Response.json({ message: "Empty question" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${env.apiUrl}/chat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: body.message.slice(0, 1000),
        accountId: typeof body.accountId === "string" && body.accountId ? body.accountId : undefined,
        history: Array.isArray(body.history) ? body.history.slice(-20) : undefined,
        locale: typeof body.locale === "string" ? body.locale : undefined,
        stream: true,
      }),
      signal: request.signal,
    });
  } catch {
    return Response.json({ message: (await getI18n()).t.common.apiUnreachable }, { status: 503 });
  }

  const type = upstream.headers.get("content-type") ?? "application/json";
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": type, "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" },
  });
}
