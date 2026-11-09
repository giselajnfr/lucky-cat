"use client";
import { useState } from "react";

/** Room code with Copy + Share. The share link opens the Join screen with the code already filled in. */
export function RoomCode({ code }: { code: string }) {
  const [note, setNote] = useState<string | null>(null);
  const flash = (t: string) => { setNote(t); setTimeout(() => setNote(null), 1800); };
  const text = `Gabung game Lucky Cat Mahjong. Kode ruang: ${code}`;

  async function copy() {
    try { await navigator.clipboard.writeText(code); flash("Kode disalin"); } catch { flash("Salin manual: " + code); }
  }
  async function share() {
    const url = `${location.origin}/game/join?code=${code}`;
    if (navigator.share) { try { await navigator.share({ title: "Lucky Cat Mahjong", text, url }); } catch { /* cancelled */ } return; }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); flash("Tautan disalin"); } catch { flash("Gagal menyalin"); }
  }

  return (
    <div className="card flex items-center justify-between gap-3 !py-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Kode ruang</p>
        <p className="text-2xl font-extrabold tracking-[0.3em]">{code}</p>
      </div>
      <div className="flex items-center gap-2">
        {note && <span role="status" className="text-xs font-semibold text-pos">{note}</span>}
        <button type="button" className="btn-secondary btn-sm" onClick={copy}>Salin</button>
        <button type="button" className="btn-secondary btn-sm" onClick={share}>Bagikan</button>
      </div>
    </div>
  );
}
