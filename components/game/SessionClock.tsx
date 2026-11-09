"use client";
import { useEffect, useState } from "react";
import { clockState, fmtClock, fmtMinutes } from "@/lib/game/session";

/**
 * Play-time guide. Counts down what is left of the time the table paid for, then counts the overtime.
 * It never pauses, locks or closes anything: the cashier settles extra time at the till.
 * `compact` is the one-line version used on the admin table cards.
 */
export function SessionClock({ startedAt, minutes, compact = false }: { startedAt: string; minutes: number; compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);   // null until mounted: server and browser clocks must not disagree in the HTML
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const c = now === null ? null : clockState({ startedAt, minutes }, now);
  const tone = !c ? "text-cream" : c.over ? "text-warn" : c.low ? "text-warn" : "text-cream";
  const bar = !c ? "bg-cream" : c.over || c.low ? "bg-warn" : "bg-cream";
  const big = c ? (c.over ? `+${fmtClock(c.overtimeMs)}` : fmtClock(c.remainingMs)) : "–:––:––";
  const label = c?.over ? "lewat dari waktu" : "tersisa di jam";

  if (compact)
    return (
      <div role="timer" aria-label={`Waktu bermain ${fmtMinutes(minutes)}`} className="rounded-xl bg-base px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">Waktu · {fmtMinutes(minutes)}</span>
          <span className={`font-mono text-lg font-extrabold tabular-nums ${tone}`}>{big} <span className="text-[11px] font-semibold text-muted">{label}</span></span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-well"><div className={`h-full rounded-full transition-[width] ${bar}`} style={{ width: `${Math.round((c?.fraction ?? 0) * 100)}%` }} /></div>
      </div>
    );

  return (
    <section role="timer" aria-label={`Waktu bermain ${fmtMinutes(minutes)}`} className="rounded-2xl border border-line bg-card p-5 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Waktu bermain · {fmtMinutes(minutes)}</p>
      <p className={`mt-2 font-mono text-5xl font-extrabold leading-none tabular-nums ${tone}`}>{big}</p>
      <p className="mt-2 text-sm text-muted">{label}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-well"><div className={`h-full rounded-full transition-[width] ${bar}`} style={{ width: `${Math.round((c?.fraction ?? 0) * 100)}%` }} /></div>
      <p className="mt-3 text-xs text-muted">
        {c?.over ? "Waktu sudah lewat. Ini hanya panduan: permainan tidak ditutup, minta tambahan waktu ke kasir." : "Hanya panduan. Permainan tidak ditutup otomatis saat waktu habis."}
      </p>
    </section>
  );
}
