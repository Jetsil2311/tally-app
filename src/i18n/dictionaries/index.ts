import type { Language } from "../config";
import { en, type Dictionary } from "./en";
import { es } from "./es";

// Both dictionaries are small, so they're bundled together: the client can
// switch language without a round trip, and function entries (plurals,
// sentences with amounts) work on both sides of the server/client boundary.
export const dictionaries: Record<Language, Dictionary> = { en, es };

export type { Dictionary };
