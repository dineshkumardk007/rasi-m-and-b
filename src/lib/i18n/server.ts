import { cookies } from "next/headers";
import {
  LANGUAGES,
  translate,
  type Language,
  type TranslationKey,
} from "./dictionary";

const COOKIE_KEY = "rasi-lang";

/** Read the visitor's language on the server (cookie set by the toggle). */
export async function getLanguage(): Promise<Language> {
  const store = await cookies();
  const value = store.get(COOKIE_KEY)?.value;
  return LANGUAGES.includes(value as Language) ? (value as Language) : "en";
}

/** Server-side translator for RSCs, metadata, emails and WhatsApp payloads. */
export async function getT() {
  const lang = await getLanguage();
  return {
    lang,
    t: (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(lang, key, vars),
  };
}
