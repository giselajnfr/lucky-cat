"use client";
import { errText } from "@/lib/i18n/errors";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { useI18n } from "@/components/i18n/I18nProvider";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { t } = useI18n();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";

  // /auth/callback sends people back here with ?error=callback when Google or the email link failed.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "callback")
      setError("Login gagal. Link kedaluwarsa atau login dibatalkan. Silakan coba masuk lagi.");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null); setInfo(null);
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(errText(error.message)); else { router.push("/home"); router.refresh(); }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { display_name: name }, emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) setError(errText(error.message));
      else if (data.session) { router.push("/home"); router.refresh(); }
      else setInfo(t("auth.checkEmail"));
    }
    setBusy(false);
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });
    if (error) setError(errText(error.message));
  }

  const label = "mb-1.5 block text-xs font-semibold text-cream";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-8 pt-14">
      <div className="mb-4 flex justify-end"><LanguageToggle /></div>
      <Logo />
      <form onSubmit={submit} className="mt-8 space-y-4">
        {!isLogin && (<div><label className={label} htmlFor="name">{t("auth.name")}</label>
          <input id="name" className="input" placeholder={t("auth.namePh")} value={name} onChange={(e) => setName(e.target.value)} required /></div>)}
        <div><label className={label} htmlFor="email">{t("auth.email")}</label>
          <input id="email" className="input" type="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
        <div><label className={label} htmlFor="password">{t("auth.password")}</label>
          <input id="password" className="input" type="password" placeholder={t("auth.passwordPh")} minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={isLogin ? "current-password" : "new-password"} /></div>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {info && <p className="text-sm text-muted">{info}</p>}
        <button className="btn-primary" disabled={busy}>{isLogin ? t("auth.login") : t("auth.register")}</button>
        <button type="button" onClick={google} className="btn-outline">{t("auth.google")}</button>
      </form>
      <p className="mt-auto pt-10 text-center text-sm text-muted">
        {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
        <Link className="font-bold text-cream underline" href={isLogin ? "/register" : "/login"}>{isLogin ? t("auth.register") : t("auth.login")}</Link>
      </p>
    </main>
  );
}
