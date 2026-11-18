import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, isLang, type Lang } from "./config";
import { translate, type Key } from "./dictionary";
import { registerServerLangReader } from "./locale";

/** Server components: read the language from the cookie. */
export function getLang(): Lang {
  const v = cookies().get(LANG_COOKIE)?.value;
  return isLang(v) ? v : DEFAULT_LANG;
}
// Lets appLocale() (number/date formatting) read THIS request's cookie instead of a shared global.
registerServerLangReader(getLang);

/** Server components: `const t = getT();  t("home.greeting", { name })` */
export function getT() {
  const lang = getLang();
  return (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars);
}
