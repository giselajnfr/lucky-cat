"use client";
import { LogoutButton } from "./LogoutButton";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { useI18n } from "@/components/i18n/I18nProvider";

/** Avatar in the page header. Tapping it opens a small panel with the account, the language switch and the logout button. */
export function AccountMenu({ name, email }: { name: string; email?: string | null }) {
  const { t } = useI18n();
  return (
    <details className="group relative">
      <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-line bg-card font-bold [&::-webkit-details-marker]:hidden" aria-label={t("account.aria", { name })}>
        {name[0]?.toUpperCase()}
      </summary>
      <div className="absolute right-0 top-12 z-30 w-60 rounded-2xl border border-line bg-card p-4 shadow-xl">
        <p className="truncate font-bold">{name}</p>
        {email && <p className="truncate text-xs text-muted">{email}</p>}
        <div className="mt-3 flex items-center justify-between"><span className="text-xs font-semibold text-muted">{t("language")}</span><LanguageToggle /></div>
        <div className="mt-3"><LogoutButton className="btn-secondary !border-neg !text-neg" label={t("account.logout")} /></div>
      </div>
    </details>
  );
}
