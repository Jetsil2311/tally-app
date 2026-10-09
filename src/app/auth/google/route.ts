import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { env } from "@/lib/env";
import {
  authorizationUrl,
  createPkce,
  normalizeProfileCode,
  OAUTH_NEXT_COOKIE,
  OAUTH_PROFILE_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  safeNext,
} from "@/lib/oauth";

// Starts "Sign in with Google": remembers state + PKCE verifier for the
// callback, then sends the browser to Google's consent screen.
export async function GET(request: NextRequest) {
  return start(request, request.nextUrl.searchParams.get("next"), null);
}

// Same, for a family profile's first sign-in: the login page POSTs the
// one-time code from their guardian (a POST keeps it out of URLs and logs).
// It rides along in an httpOnly cookie until the callback.
export async function POST(request: NextRequest) {
  // Only from Tally's own login page. Without this, another site could
  // submit its own code and link a visitor's Google account to a profile
  // it controls.
  const origin = request.headers.get("origin");
  if (origin !== new URL(env.appUrl).origin) {
    return new Response("Forbidden", { status: 403 });
  }
  const form = await request.formData();
  const next = form.get("next");
  const code = normalizeProfileCode(String(form.get("code") ?? ""));
  if (!code) return Response.redirect(new URL("/login?error=profileCode", request.url), 303);
  return start(request, typeof next === "string" ? next : null, code, 303);
}

async function start(request: NextRequest, next: string | null, profileCode: string | null, status = 302) {
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
  store.set(OAUTH_NEXT_COOKIE, safeNext(next), options);
  if (profileCode) store.set(OAUTH_PROFILE_COOKIE, profileCode, options);
  else store.delete({ name: OAUTH_PROFILE_COOKIE, path: "/auth" });

  return Response.redirect(authorizationUrl(state, challenge), status);
}
