import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: is there a session cookie at all? The real check
// happens on the API with every request (an expired token lands on
// /auth/expired), so this just avoids rendering the app shell for a
// signed-out visitor and keeps signed-in users off the login page.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("ft_session");
  const { pathname, search } = request.nextUrl;

  if (pathname === "/login") {
    return hasSession && !request.nextUrl.searchParams.has("error")
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  if (!hasSession) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!auth|_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:svg|png|jpg|webp|ico)$).*)"],
};
