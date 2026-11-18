"use client";
import { useI18n } from "./I18nProvider";

/** ID | EN segmented switch. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const opt = (l: "id" | "en") => (
    <button type="button" onClick={() => setLang(l)} aria-pressed={lang === l} lang={l}
      className={`min-w-[2.25rem] rounded-full px-2.5 py-1 text-xs font-extrabold ${lang === l ? "bg-cream text-base" : "text-muted"}`}>{l.toUpperCase()}</button>
  );
  return <div role="group" aria-label="Language / Bahasa" className={`inline-flex items-center rounded-full border border-line bg-card p-0.5 ${className}`}>{opt("id")}{opt("en")}</div>;
}
