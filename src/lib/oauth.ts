import "server-only";
import { createHash, randomBytes } from "node:crypto";

import { env } from "./env";

// Google OAuth 2.0 authorization-code flow with PKCE.
// The dashboard trades the code for Google's ID token on the server, then
// hands that ID token to the API (POST /auth/google), which verifies it and
// returns its own session token.
export const OAUTH_STATE_COOKIE = "ft_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "ft_oauth_verifier";
export const OAUTH_NEXT_COOKIE = "ft_oauth_next";

export const redirectUri = () => `${env.appUrl}/auth/callback`;

const base64url = (buffer: Buffer) => buffer.toString("base64url");

export function createPkce() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  const state = base64url(randomBytes(16));
  return { verifier, challenge, state };
}

export function authorizationUrl(state: string, challenge: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url;
}

export async function exchangeCode(code: string, verifier: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.id_token !== "string") {
    throw new Error(payload.error_description ?? payload.error ?? "Google sign-in failed");
  }
  return payload.id_token;
}

// Only same-site relative paths, so ?next= can't redirect off-site
export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/auth")) return "/";
  return value;
}
