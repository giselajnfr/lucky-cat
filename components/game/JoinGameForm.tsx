"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Same alphabet the room-code generator uses (no I, O, 0, 1: easy to misread).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const clean = (v: string) => v.toUpperCase().split("").filter((c) => ALPHABET.includes(c)).join("").slice(0, 4);

export function JoinGameForm({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [code, setCode] = useState(clean(initialCode));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 4) return;
    setBusy(true); setError(null);
    const { data, error } = await supabase.rpc("join_game", { code });
    if (error) {
      setError(/not found/i.test(error.message) ? "Kode ruang tidak ditemukan. Periksa lagi huruf dan angkanya." : error.message);
      setBusy(false); return;
    }
    router.push(`/game/${data}`); router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="code" className="mb-1.5 block text-xs font-semibold">Kode ruang</label>
        <input id="code" value={code} onChange={(e) => setCode(clean(e.target.value))} autoFocus autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
          maxLength={4} placeholder="ABCD" aria-describedby="code-help" className="input !min-h-[72px] text-center text-4xl font-extrabold tracking-[0.4em]" />
        <p id="code-help" className="mt-2 text-xs text-muted">Minta kode 4 karakter dari pembuat game. Kamu akan melihat skor dan riwayat tangan secara langsung sebagai penonton.</p>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-neg">{error}</p>}
      <button className="btn-primary" disabled={busy || code.length !== 4}>{busy ? "Mencari…" : "Gabung game"}</button>
    </form>
  );
}
