"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fmtMinutes } from "@/lib/game/session";

const CHOICES: { label: string; minutes: number | null }[] = [
  { label: "1 jam", minutes: 60 }, { label: "2 jam", minutes: 120 }, { label: "3 jam", minutes: 180 }, { label: "4 jam", minutes: 240 }, { label: "Tanpa batas", minutes: null },
];

/** Admin: opens a ROOM only. Players choose names, rules, starting points and faan cap themselves after joining with the code. */
export function OpenRoomForm({ tableId }: { tableId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [choice, setChoice] = useState<number | null | "other">(120);
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherMin = Math.round(Number(other.replace(",", ".")) * 60);
  const minutes = choice === "other" ? otherMin : choice;
  const valid = choice !== "other" || (Number.isFinite(otherMin) && otherMin >= 1 && otherMin <= 1440);
  const chip = (on: boolean) => `min-h-[44px] rounded-xl border px-4 text-sm font-semibold transition ${on ? "border-cream bg-cream text-base" : "border-line bg-card text-cream"}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!valid) return; setBusy(true); setError(null);
    const { error } = await supabase.rpc("admin_open_room", { p_table: tableId, p_minutes: minutes });
    if (error) { setError(error.message); setBusy(false); return; }
    router.push("/admin/tables"); router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <section className="card space-y-3">
        <h2 className="section-label">Lama bermain</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Lama bermain">
          {CHOICES.map((c) => <button type="button" role="radio" aria-checked={choice === c.minutes} key={c.label} className={chip(choice === c.minutes)} onClick={() => setChoice(c.minutes)}>{c.label}</button>)}
          <button type="button" role="radio" aria-checked={choice === "other"} className={chip(choice === "other")} onClick={() => setChoice("other")}>Lainnya</button>
        </div>
        {choice === "other" && (
          <div>
            <label htmlFor="hrs" className="mb-1.5 block text-xs font-semibold">Jam (boleh desimal, mis. 1,5)</label>
            <input id="hrs" inputMode="decimal" autoFocus className="input max-w-[10rem]" placeholder="1,5" value={other} onChange={(e) => setOther(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 5))} />
            {!valid && other !== "" && <p role="alert" className="mt-1 text-xs text-neg">Antara 1 menit dan 24 jam.</p>}
          </div>)}
        <p className="text-xs text-muted">
          {minutes ? `Pemain melihat sisa waktu ${fmtMinutes(minutes)} di ponsel mereka.` : "Tanpa jam hitung mundur."} Ini hanya panduan: meja tidak ditutup saat waktu habis, dan kamu bisa menambah waktu kapan saja dari Live Tables.
        </p>
      </section>
      <p className="card text-sm text-muted">Nama pemain, buku aturan (Chicken Hand, Beginner, Advanced), skor awal, dan batas faan diisi oleh pemain sendiri setelah mereka bergabung dengan kode ruang.</p>
      {error && <p role="alert" className="text-sm font-semibold text-neg">{error}</p>}
      <button className="btn-primary" disabled={!valid || busy}>{busy ? "Membuat…" : "Buat kode ruang"}</button>
    </form>
  );
}
