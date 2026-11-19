"use client";
import { errText } from "@/lib/i18n/errors";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TV_SETTINGS, type TvSettings } from "@/lib/tv/types";

export function TvControls() {
  const supabase = useMemo(() => createClient(), []);
  const [s, setS] = useState<TvSettings>(DEFAULT_TV_SETTINGS);
  const [tables, setTables] = useState<{ id: string; table_number: number }[]>([]);
  const [tvs, setTvs] = useState(0);

  useEffect(() => {
    supabase.from("tv_settings").select("*").eq("id", 1).single().then(({ data }) => data && setS(data as TvSettings));
    supabase.from("cafe_tables").select("id, table_number").order("table_number").then(({ data }) => data && setTables(data));
    // Presence: every open /tv screen registers on the same public channel.
    const ch = supabase.channel("tv:live").on("presence", { event: "sync" }, () => setTvs(Object.keys(ch.presenceState()).length)).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase]);

  async function save(patch: Partial<TvSettings>) {
    const before = s;
    setS((p) => ({ ...p, ...patch }));
    const { data, error } = await supabase.from("tv_settings").update(patch).eq("id", 1).select("id");
    // RLS can reject an update WITHOUT an error (0 rows changed): treat that as a failure too, so the screen never shows a mode that was not saved.
    if (!error && (!data || data.length === 0)) {
      setS(before);
      alert("Pengaturan TV tidak tersimpan. Pastikan Anda login sebagai admin.");
      return;
    }
    if (error) {
      setS(before);   // do not pretend it was saved
      // "Main Leaderboard" needs migration_008 (the database only allows live/spotlight/leaderboard/rotate until then).
      alert(/tv_settings_mode_check|check constraint/i.test(error.message)
        ? "Mode ini belum diaktifkan di database. Jalankan supabase/migration_008_tv_main_leaderboard.sql di Supabase SQL Editor. Sementara itu, buka layar TV lewat tombol \"Main Leaderboard\" di bawah."
        : errText(error.message));
    }
  }
  const row = "flex items-center justify-between gap-3";
  return (
    <div className="card max-w-xl space-y-4">
      <p className="font-bold">{tvs > 0 ? `🟢 Live — ${tvs} screen${tvs > 1 ? "s" : ""} connected` : "🔴 No TV connected"} · <a className="underline" href="/tv" target="_blank">Open /tv</a></p>
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="text-muted">Buka langsung:</span>
        <a className="underline" href="/tv/main" target="_blank" rel="noreferrer">Main Leaderboard</a>
        <a className="underline" href="/tv/tables" target="_blank" rel="noreferrer">Per Table</a>
        <a className="underline" href="/tv/rotate" target="_blank" rel="noreferrer">Auto Rotate</a>
      </div>
      <label className={row}>Mode
        <select className="input max-w-[13rem]" value={s.mode} onChange={(e) => save({ mode: e.target.value as TvSettings["mode"] })}>
          <option value="live">Live · Per Table</option><option value="main">Live · Main Leaderboard</option><option value="spotlight">Table Spotlight</option><option value="leaderboard">Today&apos;s Stats Leaderboard</option><option value="rotate">Auto Rotate</option></select></label>
      <label className={row}>Spotlight table
        <select className="input max-w-[13rem]" value={s.spotlight_table_id ?? ""} onChange={(e) => save({ spotlight_table_id: e.target.value || null })}>
          <option value="">First active</option>{tables.map((t) => <option key={t.id} value={t.id}>Table {t.table_number}</option>)}</select></label>
      <label className={row}>Stats leaderboard
        <select className="input max-w-[13rem]" value={s.leaderboard_type} onChange={(e) => save({ leaderboard_type: e.target.value as TvSettings["leaderboard_type"] })}>
          <option value="highest_score">Highest score</option><option value="most_wins">Most wins today</option><option value="highest_fan">Highest fan today</option></select></label>
      <label className={row}>Rotation interval (seconds)
        <input className="input max-w-[7rem]" type="number" min={3} max={120} value={s.rotation_interval_ms / 1000} onChange={(e) => save({ rotation_interval_ms: Math.min(120, Math.max(3, Number(e.target.value))) * 1000 })} /></label>
      <label className={row}>Winning hand highlight (seconds)
        <input className="input max-w-[7rem]" type="number" min={3} max={60} value={s.highlight_duration_ms / 1000} onChange={(e) => save({ highlight_duration_ms: Math.min(60, Math.max(3, Number(e.target.value))) * 1000 })} /></label>
      <label className={row}>Sound effects <input type="checkbox" className="h-6 w-6" checked={s.sound_enabled} onChange={(e) => save({ sound_enabled: e.target.checked })} /></label>
      <label className={row}>Winning hand animations <input type="checkbox" className="h-6 w-6" checked={s.animations_enabled} onChange={(e) => save({ animations_enabled: e.target.checked })} /></label>
      <p className="text-xs text-muted">Two screens? Open <code>/tv/tables</code> on one and <code>/tv/main</code> on the other: the link overrides the mode above for that screen only.</p>
      <p className="text-xs text-muted">Browsers block autoplay audio: after turning sound on, tap “Enable sound” once on the TV screen.</p>
    </div>
  );
}
