"use client";
import { useState } from "react";
import { HandView } from "@/components/mahjong/HandView";
import { WIND_LABEL, type CalcPayload } from "./HandCalculator";
import { buildScorecardSvg, downloadBlob, shareBlob, svgToPng } from "@/lib/scorecard/image";
import { ruleById } from "@/lib/scoring";

/** Result display, in the order: total · method & seat · tiles · itemised breakdown. */
export function ScoreCard({ payload, winnerName, title }: { payload: CalcPayload; winnerName?: string; title?: string }) {
  const { input, result } = payload;
  const [busy, setBusy] = useState<"save" | "share" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const method = input.winningMethod === "SELF_DRAW" ? "Self Draw" : "Menang dari buangan";
  const seat = `Kursi ${WIND_LABEL[input.winnerSeatWind]}`;

  if (!result.valid)
    return (
      <section className="card border-red-300/50" role="alert">
        <h2 className="font-bold text-red-200">Tangan belum valid</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{result.errors.map((e) => <li key={e}>{e}</li>)}</ul>
      </section>
    );

  async function image(): Promise<{ blob: Blob; name: string }> {
    const b = buildScorecardSvg({
      total: result.totalFan, method: input.winningMethod, seatLabel: seat, roundLabel: `Ronde ${WIND_LABEL[input.roundWind]}`, winnerName, title,
      concealed: input.concealedTiles, melds: input.melds, winningTile: input.winningTile, flowers: input.flowers,
      breakdown: result.detectedFan.map((f) => ({ name: f.name, fan: f.fan, count: f.count })),
    });
    return { blob: await svgToPng(b.svg, b.width, b.height), name: `mahjong-${result.totalFan}-poin.png` };
  }
  async function save() { setBusy("save"); setMsg(null); try { const i = await image(); downloadBlob(i.blob, i.name); setMsg("Gambar tersimpan."); } catch (e) { setMsg((e as Error).message); } setBusy(null); }
  async function share() {
    setBusy("share"); setMsg(null);
    try { const i = await image(); if (!(await shareBlob(i.blob, i.name, `${result.totalFan} poin · ${method}`))) { downloadBlob(i.blob, i.name); setMsg("Perangkat ini tidak mendukung berbagi. Gambar diunduh sebagai gantinya."); } }
    catch (e) { setMsg((e as Error).message); }
    setBusy(null);
  }

  return (
    <section className="card space-y-4" aria-live="polite">
      <div>
        <p className="text-5xl font-extrabold leading-none">{result.totalFan} <span className="text-2xl">POIN</span></p>
        <p className="mt-2 text-sm text-muted">{method} · {seat} · Ronde {WIND_LABEL[input.roundWind]}{winnerName ? ` · ${winnerName}` : ""}</p>
        {!result.meetsMinimum && (
          <p role="alert" className="mt-3 rounded-xl border border-amber-300/50 bg-base/40 p-3 text-sm text-amber-200">
            Belum memenuhi minimum {result.minimumFan} faan. Tangan ini belum bisa dicatat sebagai kemenangan.
          </p>
        )}
      </div>

      <HandView concealed={input.concealedTiles} melds={input.melds} winningTile={input.winningTile} flowers={input.flowers} width={30} />

      <div>
        <h3 className="section-label mb-2">Rincian</h3>
        <ul className="divide-y divide-line/60">
          {result.detectedFan.map((f) => (
            <li key={f.id} className="flex items-baseline justify-between py-2 text-sm">
              <span>{f.name}{f.count > 1 && <span className="text-muted"> ×{f.count}</span>}</span><span className="font-bold">+{f.fan}</span>
            </li>
          ))}
        </ul>
        {result.excludedFan.length > 0 && (
          <p className="mt-2 text-xs text-muted">Tidak dihitung (sudah termasuk): {result.excludedFan.map((e) => `${e.name} → ${ruleById(e.byId)?.name ?? e.byId}`).join("; ")}.</p>
        )}
      </div>

      {result.reviewFlags.length > 0 && (
        <div className="rounded-xl border border-line bg-base/40 p-3 text-xs text-muted">
          <p className="mb-1 font-bold text-cream">Perlu dikonfirmasi dengan aturan rumah</p>
          <ul className="list-disc space-y-1 pl-4">{result.reviewFlags.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      )}

      {result.meetsMinimum && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-secondary" onClick={save} disabled={busy !== null}>{busy === "save" ? "Menyiapkan…" : "Simpan gambar"}</button>
          <button type="button" className="btn-secondary" onClick={share} disabled={busy !== null}>{busy === "share" ? "Menyiapkan…" : "Bagikan"}</button>
        </div>
      )}
      {msg && <p className="text-sm text-muted" role="status">{msg}</p>}
    </section>
  );
}
