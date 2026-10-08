import { cookies } from "next/headers";

import { env } from "@/lib/env";
import { SESSION_COOKIE } from "@/lib/session";

// Reached when the API rejects the session (expired or revoked).
// Rendering can't delete cookies, so pages redirect here to do it.
export async function GET() {
  (await cookies()).delete(SESSION_COOKIE);
  return Response.redirect(new URL("/login?error=expired", env.appUrl), 302);
}
