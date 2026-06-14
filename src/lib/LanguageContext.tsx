"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Lang, TKey } from "./i18n";
import { t as translate } from "./i18n";

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "th",
  setLang: () => {},
  toggleLang: () => {},
  t: (key: TKey) => key,
});

const STORAGE_KEY = "mt5-lang";

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "th";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "th") return stored;
  return "th";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("th");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLangState(getInitialLang());
    setMounted(true);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "th" ? "en" : "th");
  }, [lang, setLang]);

  const tt = useCallback(
    (key: TKey, vars?: Record<string, string | number>) => translate(key, lang, vars),
    [lang],
  );

  // Avoid hydration mismatch — render nothing until mounted
  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ lang: "th", setLang, toggleLang, t: (k) => k }}>
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t: tt }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(LanguageContext);
  return ctx;
}
