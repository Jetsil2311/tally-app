import "server-only";
import { redirect } from "next/navigation";

import { getI18n } from "@/i18n/server";

import { env } from "./env";
import { PERSONAL_WORKSPACE, getToken, getWorkspaceId } from "./session";

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
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
}

// Every call to the finance-tracker API goes through here: it adds the
// session token and the current workspace, turns error responses into
// ApiError, and sends the user back to sign in when the token is missing or
// expired.
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const token = await getToken();
  if (!token) {
    redirect("/login");
  }
  const workspace = await getWorkspaceId();
  try {
    return await request<T>(path, options, token, workspace);
  } catch (error) {
    // The workspace in the cookie is gone (deleted, or you were removed from
    // it): reads carry on in personal instead of breaking every page (the
    // switcher shows personal meanwhile). Writes don't: something meant for
    // a business must never quietly land in personal.
    const read = (options.method ?? "GET") === "GET";
    if (read && error instanceof ApiError && error.status === 404 && error.message === "Workspace not found" && workspace !== PERSONAL_WORKSPACE) {
      return request<T>(path, options, token, PERSONAL_WORKSPACE);
    }
    throw error;
  }
}

async function request<T>(path: string, { method = "GET", body, query }: Options, token: string, workspace: string): Promise<T> {
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
        "X-Workspace-Id": workspace,
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
