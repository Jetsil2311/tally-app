import "server-only";

// Every variable the dashboard needs, read once. A missing one fails loudly
// on first use instead of producing a confusing error mid-request.
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

export const env = {
  // Base URL of the finance-tracker API (Fastify), e.g. http://localhost:3000
  get apiUrl() {
    return required("API_URL").replace(/\/$/, "");
  },
  // Public URL of this dashboard, used to build the OAuth redirect URI
  get appUrl() {
    return required("APP_URL").replace(/\/$/, "");
  },
  // Same web client the API lists in its GOOGLE_CLIENT_ID, so it accepts the ID token
  get googleClientId() {
    return required("GOOGLE_CLIENT_ID");
  },
  get googleClientSecret() {
    return required("GOOGLE_CLIENT_SECRET");
  },
};
