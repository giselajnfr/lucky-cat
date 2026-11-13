"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CODE_LENGTH, cleanCode } from "@/lib/calc/codes";

/** Shown instead of the quick calculator until the player enters a code that an admin generated. */
export function CalcCodeForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== CODE_LENGTH) return;
    setBusy(true); setError(null);
    const { data, error } = await supabase.rpc("redeem_calc_code", { p_code: code });
    if (error) { setError(/too many/i.test(error.message) ? "Terlalu banyak kode salah. Coba lagi beberapa menit lagi." : error.message); setBusy(false); return; }
    if (!data) { setError("Kode tidak valid, sudah kedaluwarsa, dicabut, atau sudah penuh. Minta kode baru ke staf."); setBusy(false); return; }
    router.refresh();   // the page now sees the access and shows the calculator
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="calc-code" className="mb-1.5 block text-xs font-semibold">Kode kalkulator</label>
        <input id="calc-code" value={code} onChange={(e) => setCode(cleanCode(e.target.value))} autoFocus autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false}
          maxLength={CODE_LENGTH} placeholder="ABC234" aria-describedby="calc-code-help" className="input !min-h-[72px] text-center text-3xl font-extrabold tracking-[0.3em]" />
        <p id="calc-code-help" className="mt-2 text-xs text-muted">Hitung skor cepat memakai kode {CODE_LENGTH} karakter dari staf. Cukup dimasukkan sekali, aksesmu berlaku sampai kode kedaluwarsa.</p>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-neg">{error}</p>}
      <button className="btn-primary" disabled={busy || code.length !== CODE_LENGTH}>{busy ? "Memeriksa…" : "Buka kalkulator"}</button>
    </form>
  );
}
