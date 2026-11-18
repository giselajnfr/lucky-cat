"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { LANG_COOKIE, type Lang } from "@/lib/i18n/config";
import { translate, type Key } from "@/lib/i18n/dictionary";
import { AutoTranslate } from "./AutoTranslate";
import { setRequestLang } from "@/lib/i18n/locale";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: Key, vars?: Record<string, string | number>) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: React.ReactNode }) {
  if (typeof window === "undefined") setRequestLang(initialLang);   // SSR pass: children format numbers with this request's language
  const [lang, setLangState] = useState<Lang>(initialLang);
  const setLang = useCallback((l: Lang) => {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
    setLangState(l);
    window.location.reload();   // full reload: server + client text all re-render in the new language
  }, []);
  const value = useMemo<Ctx>(() => ({ lang, setLang, t: (k, v) => translate(lang, k, v) }), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}<AutoTranslate /></I18nContext.Provider>;
}
export function useI18n(): Ctx {
  const c = useContext(I18nContext);
  if (!c) throw new Error("useI18n must be used inside <I18nProvider>");
  return c;
}
