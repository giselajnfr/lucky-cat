"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/components/i18n/I18nProvider";

/** Signs out and returns to the login page. `className` lets the caller style it as a menu row or a nav item. */
export function LogoutButton({ className = "btn-secondary", label }: { className?: string; label?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();   // drop every cached page that belonged to the signed-in user
  }
  return <button type="button" className={className} disabled={busy} onClick={logout}>{busy ? t("logout.busy") : (label ?? t("logout"))}</button>;
}
