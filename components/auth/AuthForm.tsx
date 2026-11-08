"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null); setInfo(null);
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message); else { router.push("/home"); router.refresh(); }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { display_name: name }, emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else if (data.session) { router.push("/home"); router.refresh(); }
      else setInfo("Cek email kamu untuk konfirmasi, lalu masuk.");
    }
    setBusy(false);
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });
    if (error) setError(error.message);
  }

  const label = "mb-1.5 block text-xs font-semibold text-cream";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-8 pt-14">
      <Logo />
      <form onSubmit={submit} className="mt-8 space-y-4">
        {!isLogin && (<div><label className={label} htmlFor="name">Nama</label>
          <input id="name" className="input" placeholder="Nama kamu" value={name} onChange={(e) => setName(e.target.value)} required /></div>)}
        <div><label className={label} htmlFor="email">Email</label>
          <input id="email" className="input" type="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
        <div><label className={label} htmlFor="password">Kata sandi</label>
          <input id="password" className="input" type="password" placeholder="Minimal 6 karakter" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={isLogin ? "current-password" : "new-password"} /></div>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {info && <p className="text-sm text-muted">{info}</p>}
        <button className="btn-primary" disabled={busy}>{isLogin ? "Masuk" : "Daftar"}</button>
        <button type="button" onClick={google} className="btn-outline">Lanjut dengan Google</button>
      </form>
      <p className="mt-auto pt-10 text-center text-sm text-muted">
        {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
        <Link className="font-bold text-cream underline" href={isLogin ? "/register" : "/login"}>{isLogin ? "Daftar" : "Masuk"}</Link>
      </p>
    </main>
  );
}
