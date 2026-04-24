import { createContext, useContext, useState, type ReactNode } from "react";
import ko from "./locales/ko.json";
import en from "./locales/en.json";

export type Lang = "ko" | "en";
const translations: Record<Lang, Record<string, unknown>> = { ko, en };

function lookup(obj: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object") return key;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : key;
}

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}
const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "plant2048_lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === "en" || saved === "ko") ? saved : "ko";
  });
  const setLang = (l: Lang) => { localStorage.setItem(STORAGE_KEY, l); setLangState(l); };
  const t = (key: string, vars?: Record<string, string | number>): string => {
    let str = lookup(translations[lang] as Record<string, unknown>, key);
    if (vars) Object.entries(vars).forEach(([k, v]) => {
      const re = new RegExp(`\\{\\{${k}\\}\\}`, "g");
      str = str.replace(re, String(v));
    });
    return str;
  };
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used inside I18nProvider");
  return ctx;
}
