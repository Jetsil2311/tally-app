import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { authorizationUrl, createPkce, OAUTH_NEXT_COOKIE, OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE, safeNext } from "@/lib/oauth";

// Starts "Sign in with Google": remembers state + PKCE verifier for the
// callback, then sends the browser to Google's consent screen.
export async function GET(request: NextRequest) {
  const { verifier, challenge, state } = createPkce();
  const store = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/auth",
    maxAge: 600,
  };
  store.set(OAUTH_STATE_COOKIE, state, options);
  store.set(OAUTH_VERIFIER_COOKIE, verifier, options);
  store.set(OAUTH_NEXT_COOKIE, safeNext(request.nextUrl.searchParams.get("next")), options);

  return Response.redirect(authorizationUrl(state, challenge), 302);
}
