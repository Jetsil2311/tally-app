import "server-only";
import { redirect } from "next/navigation";

import { getI18n } from "@/i18n/server";

import { env } from "./env";
import { getToken } from "./session";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues: { path: (string | number)[]; message: string }[] = [],
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface Options {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
}

// Every call to the finance-tracker API goes through here: it adds the
// session token, turns error responses into ApiError, and sends the user
// back to sign in when the token is missing or expired.
export async function api<T>(path: string, { method = "GET", body, query }: Options = {}): Promise<T> {
  const token = await getToken();
  if (!token) {
    redirect("/login");
  }

  const url = new URL(env.apiUrl + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(503, (await getI18n()).t.common.apiUnreachable);
  }

  if (response.status === 401) {
    // Clears the cookie (only a Route Handler or Action can) and goes to /login
    redirect("/auth/expired");
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.message ?? `Request failed (${response.status})`,
      payload?.issues ?? [],
    );
  }

  return payload as T;
}
