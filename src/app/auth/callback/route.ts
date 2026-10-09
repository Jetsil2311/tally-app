import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { env } from "@/lib/env";
import {
  exchangeCode,
  OAUTH_NEXT_COOKIE,
  OAUTH_PROFILE_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  safeNext,
} from "@/lib/oauth";
import { SESSION_COOKIE } from "@/lib/session";

// Google redirects here with ?code&state. We check the state, trade the
// code for an ID token, exchange that for an API session, and store the
// session in an httpOnly cookie.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const store = await cookies();
  const expectedState = store.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = store.get(OAUTH_VERIFIER_COOKIE)?.value;
  const next = safeNext(store.get(OAUTH_NEXT_COOKIE)?.value);
  const profileCode = store.get(OAUTH_PROFILE_COOKIE)?.value;
  for (const name of [OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE, OAUTH_NEXT_COOKIE, OAUTH_PROFILE_COOKIE]) {
    store.delete({ name, path: "/auth" });
  }

  const fail = (reason: string) => {
    const url = new URL("/login", env.appUrl);
    url.searchParams.set("error", reason);
    return Response.redirect(url, 302);
  };

  if (params.get("error")) return fail("cancelled");
  const code = params.get("code");
  if (!code || !verifier || !expectedState || params.get("state") !== expectedState) {
    return fail("state");
  }

  let idToken: string;
  try {
    idToken = await exchangeCode(code, verifier);
  } catch {
    return fail("google");
  }

  let session: { token: string; expiresIn: string };
  try {
    const response = await fetch(`${env.apiUrl}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // profileCode links this Google login to a family profile (first sign-in only)
      body: JSON.stringify(profileCode ? { idToken, profileCode } : { idToken }),
    });
    if (!response.ok) return fail(profileCode && response.status === 400 ? "profileCode" : "api");
    session = await response.json();
  } catch {
    return fail("unreachable");
  }

  store.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: durationToSeconds(session.expiresIn),
  });

  return Response.redirect(new URL(next, env.appUrl), 302);
}

// "7d" / "12h" / "30m" / "3600" -> seconds (the API's JWT_EXPIRES_IN format)
function durationToSeconds(value: string) {
  const match = /^(\d+)\s*([smhd])?$/.exec(value?.trim() ?? "");
  if (!match) return 60 * 60 * 24 * 7;
  const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] ?? "s"] ?? 1;
  return Number(match[1]) * unit;
}
