export type Lang = "id" | "en";
export const LANGS: Lang[] = ["id", "en"];
export const DEFAULT_LANG: Lang = "id";
export const LANG_COOKIE = "lc_lang";
export const isLang = (v: unknown): v is Lang => v === "id" || v === "en";
