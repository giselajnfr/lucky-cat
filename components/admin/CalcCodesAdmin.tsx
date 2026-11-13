"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { USE_CHOICES, VALIDITY_CHOICES, codeStatus, type CalcCodeRow, type CodeStatus } from "@/lib/calc/codes";

const TONE: Record<CodeStatus, string> = { aktif: "bg-pos/15 text-pos", penuh: "bg-warn/15 text-warn", kedaluwarsa: "border border-line text-muted", dicabut: "border border-neg/50 text-neg" };
const fmt = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

/** Admin: generate access codes for the quick calculator, copy them, and revoke them. */
export function CalcCodesAdmin({ codes }: { codes: CalcCodeRow[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [label, setLabel] = useState("");
  const [hours, setHours] = useState(24);
  const [max, setMax] = useState<number | null>(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const chip = (on: boolean) => `min-h-[44px] rounded-xl border px-4 text-sm font-semibold transition ${on ? "border-cream bg-cream text-base" : "border-line bg-card text-cream"}`;

  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    const { data, error } = await supabase.rpc("admin_create_calc_code", { p_label: label, p_hours: hours, p_max_uses: max });
    setBusy(false);
    if (error) { setError(error.message); return; }
    setFresh(data as string); setLabel(""); router.refresh();
  }
  async function revoke(id: string) {
    if (!confirm("Cabut kode ini? Semua orang yang memakainya kehilangan akses.")) return;
    const { error } = await supabase.rpc("admin_revoke_calc_code", { p_id: id });
    if (error) setError(error.message); else router.refresh();
  }
  async function copy(code: string) {
    try { await navigator.clipboard.writeText(code); setNote(`Kode ${code} disalin`); } catch { setNote(`Salin manual: ${code}`); }
    setTimeout(() => setNote(null), 2000);
  }

  return (
    <div className="space-y-5">
      <form onSubmit={create} className="card max-w-xl space-y-4">
        <h2 className="text-lg">Buat kode baru</h2>
        <div>
          <label htmlFor="cc-label" className="mb-1.5 block text-xs font-semibold">Untuk siapa (opsional)</label>
          <input id="cc-label" className="input" maxLength={60} placeholder="Contoh: Meja 6, atau Event Sabtu" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div><p className="mb-1.5 text-xs font-semibold">Berlaku selama</p><div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Masa berlaku">{VALIDITY_CHOICES.map((c) => <button type="button" role="radio" aria-checked={hours === c.hours} key={c.hours} className={chip(hours === c.hours)} onClick={() => setHours(c.hours)}>{c.label}</button>)}</div></div>
        <div><p className="mb-1.5 text-xs font-semibold">Boleh dipakai</p><div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Jumlah pemakai">{USE_CHOICES.map((c) => <button type="button" role="radio" aria-checked={max === c.max} key={c.label} className={chip(max === c.max)} onClick={() => setMax(c.max)}>{c.label}</button>)}</div></div>
        {error && <p role="alert" className="text-sm font-semibold text-neg">{error}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? "Membuat…" : "Buat kode"}</button>
        {fresh && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-pos/50 bg-pos/10 p-4" role="status">
            <div><p className="text-xs text-muted">Kode baru, berikan ke pemain</p><p className="text-3xl font-extrabold tracking-[0.3em]">{fresh}</p></div>
            <button type="button" className="btn-secondary btn-sm" onClick={() => copy(fresh)}>Salin</button>
          </div>)}
      </form>

      <section aria-label="Daftar kode">
        <div className="mb-3 flex items-center justify-between"><h2 className="section-label">Semua kode</h2>{note && <span role="status" className="text-xs font-semibold text-pos">{note}</span>}</div>
        {codes.length === 0 ? <p className="card text-sm text-muted">Belum ada kode.</p> : (
          <ul className="grid gap-3 md:grid-cols-2">
            {codes.map((c) => {
              const st = codeStatus(c);
              return (
                <li key={c.id} className={`card ${st === "aktif" ? "" : "opacity-70"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="text-2xl font-extrabold tracking-[0.25em]">{c.code}</p><p className="truncate text-sm text-muted">{c.label || "Tanpa label"}</p></div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${TONE[st]}`}>{st}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted">Dipakai {c.uses}{c.max_uses != null ? ` dari ${c.max_uses}` : ""} orang · sampai {fmt(c.expires_at)}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="btn-secondary btn-sm" onClick={() => copy(c.code)}>Salin</button>
                    {st === "aktif" || st === "penuh" ? <button type="button" className="btn-secondary btn-sm !border-neg !text-neg" onClick={() => revoke(c.id)}>Cabut</button> : null}
                  </div>
                </li>);
            })}
          </ul>)}
      </section>
    </div>
  );
}
