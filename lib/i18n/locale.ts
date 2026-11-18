import type { Lang } from "./config";
declare global { var __lcLang: Lang | undefined; var __lcLangReader: (() => Lang) | undefined; }

/**
 * Language for formatting (dates, numbers).
 * - Browser: reads <html lang>, which is always right for this tab.
 * - Server components: a reader registered by lib/i18n/server.ts reads the request's own cookie, so it cannot
 *   leak between concurrent requests (the old per-request global could).
 * - Server-rendered client components (SSR pass): fall back to the global, which the root layout and
 *   <I18nProvider> both set right before their children render.
 */
export function setRequestLang(l: Lang) { globalThis.__lcLang = l; }
export function registerServerLangReader(fn: () => Lang) { globalThis.__lcLangReader = fn; }
export function currentLang(): Lang {
  if (typeof document !== "undefined") return document.documentElement.lang === "en" ? "en" : "id";
  try { const r = globalThis.__lcLangReader; if (r) return r() === "en" ? "en" : "id"; } catch { /* outside a request: use the global */ }
  return globalThis.__lcLang === "en" ? "en" : "id";
}
/** Locale for dates and numbers: "id-ID" (1.500, 15 Nov) or "en-US" (1,500, Nov 15). */
export const appLocale = () => (currentLang() === "en" ? "en-US" : "id-ID");
