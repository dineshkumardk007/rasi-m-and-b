"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LANGUAGES,
  translate,
  type Language,
  type TranslationKey,
} from "./dictionary";

const STORAGE_KEY = "rasi.lang";
const COOKIE_KEY = "rasi-lang";

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLang = "en",
}: {
  children: ReactNode;
  /** Server-detected language (from the rasi-lang cookie) to avoid a flash. */
  initialLang?: Language;
}) {
  const [lang, setLangState] = useState<Language>(initialLang);

  // Reconcile with any locally persisted choice after hydration.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && LANGUAGES.includes(stored as Language) && stored !== lang) {
      setLangState(stored as Language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    // Cookie so server components & transactional flows see the same choice.
    document.cookie = `${COOKIE_KEY}=${next};path=/;max-age=31536000;samesite=lax`;
  }, []);

  const t = useCallback<LanguageContextValue["t"]>(
    (key, vars) => translate(lang, key, vars),
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

/** Client-side translation hook. Server components use getT() from server.ts. */
export function useT(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useT must be used inside <LanguageProvider>");
  return ctx;
}
