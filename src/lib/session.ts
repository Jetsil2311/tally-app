import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";

// The API's JWT lives in an httpOnly cookie, so client JavaScript never sees it.
// Every request to the API is made from the server with this token.
export const SESSION_COOKIE = "ft_session";
// Display preferences, readable by client code too (no secrets in them)
export const CURRENCY_COOKIE = "ft_currency";
export const TZ_COOKIE = "ft_tz";

export const DEFAULT_CURRENCY = "USD";

export async function getToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export async function getPreferences() {
  const store = await cookies();
  const currency = store.get(CURRENCY_COOKIE)?.value ?? DEFAULT_CURRENCY;
  const timeZone = validTimeZone(store.get(TZ_COOKIE)?.value);
  return { currency, timeZone };
}

function validTimeZone(value: string | undefined) {
  if (!value) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return "UTC";
  }
}

// "Now" for this request. connection() tells Next.js the time is read per
// request, so it's never baked into a prerendered shell.
export async function requestTime() {
  await connection();
  return new Date();
}
