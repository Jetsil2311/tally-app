import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_COOKIE, detectLocale, validLocale } from "./i18n/config";

const YEAR = 60 * 60 * 24 * 365;

// 1. Language: on the first visit, picks English or Spanish from the
//    visitor's region (Vercel's x-vercel-ip-country) and browser languages,
//    and remembers it in a cookie. After that the cookie wins, so travelling
//    doesn't flip the language; Settings can change it.
// 2. Optimistic auth check: is there a session cookie at all? The real check
//    happens on the API with every request (an expired token lands on
//    /auth/expired), so this just avoids rendering the app shell for a
//    signed-out visitor and keeps signed-in users off the login page.
export function proxy(request: NextRequest) {
  const saved = validLocale(request.cookies.get(LOCALE_COOKIE)?.value);
  const locale =
    saved ??
    detectLocale({
      country: request.headers.get("x-vercel-ip-country"),
      acceptLanguage: request.headers.get("accept-language"),
    });

  const respond = (response: NextResponse) => {
    if (!saved) response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: YEAR, sameSite: "lax" });
    return response;
  };

  // Lets this same request render in the detected language: the cookie set
  // on the response only arrives with the next request
  const next = () => {
    if (saved) return NextResponse.next();
    const headers = new Headers(request.headers);
    const cookie = request.headers.get("cookie");
    headers.set("cookie", `${cookie ? `${cookie}; ` : ""}${LOCALE_COOKIE}=${locale}`);
    return respond(NextResponse.next({ request: { headers } }));
  };

  const hasSession = request.cookies.has("ft_session");
  const { pathname, search } = request.nextUrl;

  if (pathname === "/login") {
    return hasSession && !request.nextUrl.searchParams.has("error")
      ? respond(NextResponse.redirect(new URL("/", request.url)))
      : next();
  }

  // Signed-out visitors get the landing page: at "/" (same URL, rewritten)
  // or directly at /landing
  if (!hasSession && (pathname === "/" || pathname === "/landing")) {
    if (pathname === "/landing") return next();
    const headers = new Headers(request.headers);
    if (!saved) {
      const cookie = request.headers.get("cookie");
      headers.set("cookie", `${cookie ? `${cookie}; ` : ""}${LOCALE_COOKIE}=${locale}`);
    }
    return respond(NextResponse.rewrite(new URL("/landing", request.url), { request: { headers } }));
  }

  if (!hasSession) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return respond(NextResponse.redirect(url));
  }

  return next();
}

export const config = {
  matcher: ["/((?!auth|_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:svg|png|jpg|webp|ico)$).*)"],
};
