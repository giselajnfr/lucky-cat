"use client";
import { errText } from "@/lib/i18n/errors";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { RoomCode } from "@/components/game/RoomCode";
import { SessionClock } from "@/components/game/SessionClock";
import { extendedTotal, fmtMinutes } from "@/lib/game/session";
import { ruleSummary } from "@/lib/game/presets";
import type { RulePreset } from "@/lib/game/types";
import { fmtScore, scoreTone } from "@/lib/ui/score";
import { MEDALS, ROUND_NAME, STATUS_LABEL, WIND_NAME, seatWind } from "@/lib/tv/types";

type P = { id: string; player_name: string; seat_position: number; current_score: number };
type Row = { id: string; table_number: number; status: string; games: null | { id: string; room_code: string; status: string; current_round_wind: string; current_dealer_seat: number; setup_complete: boolean; starting_points: number; session_minutes: number | null; session_started_at: string; min_fan: number; max_fan: number | null; rule_preset: RulePreset; ruleset?: string; game_players: P[]; game_hands: { count: number }[] } };

export function AdminLiveTables() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [num, setNum] = useState("");
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);   // visible feedback for Add table (an alert() can be blocked in app browsers)
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("cafe_tables")
      .select("id, table_number, status, games(id, room_code, status, current_round_wind, current_dealer_seat, setup_complete, starting_points, session_minutes, session_started_at, min_fan, max_fan, rule_preset, ruleset, game_players(id, player_name, seat_position, current_score), game_hands(count))")
      .order("table_number");
    if (error) { setLoadError(errText(error.message)); return; }   // e.g. a database migration has not been run yet
    setLoadError(null);
    if (data) setRows(data as unknown as Row[]);
  }, [supabase]);

  useEffect(() => {
    load();
    let t: ReturnType<typeof setTimeout>;
    const soon = () => { clearTimeout(t); t = setTimeout(load, 300); };
    const ch = supabase.channel("admin-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players" }, soon)
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, soon)
      .on("postgres_changes", { event: "*", schema: "public", table: "cafe_tables" }, soon)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_hands" }, soon)
      .subscribe();
    return () => { clearTimeout(t); supabase.removeChannel(ch); };
  }, [supabase, load]);

  /** The number to use when the box is left empty: one more than the highest table. */
  const nextNumber = rows.reduce((m, r) => Math.max(m, r.table_number), 0) + 1;

  async function addTable(e: React.FormEvent) {
    e.preventDefault();
    if (adding) return;
    const n = num.trim() === "" ? nextNumber : Number(num);
    if (!Number.isInteger(n) || n < 1) { setNotice({ ok: false, text: "Nomor meja harus bilangan bulat mulai dari 1." }); return; }
    if (rows.some((r) => r.table_number === n)) { setNotice({ ok: false, text: "Nomor meja sudah dipakai. Pilih nomor lain." }); return; }
    setAdding(true); setNotice(null);
    const { error } = await supabase.rpc("admin_create_table", { p_number: n });
    setAdding(false);
    if (error) { setNotice({ ok: false, text: errText(error.message) }); return; }
    setNum(""); setNotice({ ok: true, text: "Meja baru ditambahkan." });
    load();
  }

  async function call(fn: string, args: Record<string, unknown>) {
    const { error } = await supabase.rpc(fn, args);
    if (error) alert(errText(error.message)); else load();
  }

  /**
   * Release without leaving an orphan: a game that is still running is finished first (final ranks are saved), a room
   * nobody played in is deleted. Releasing alone would leave the game "in progress" with no table, inflating live counts.
   */
  async function release(r: Row) {
    const g = r.games;
    if (!g || g.status === "finished") { if (confirm("Lepas meja ini?")) await call("admin_release_table", { p_table: r.id }); return; }
    const hands = g.game_hands?.[0]?.count ?? 0;
    if (hands > 0) {
      if (!confirm(`Game di meja ini belum diakhiri (${hands} tangan tercatat).\n\nAkhiri game, simpan hasilnya, lalu lepas meja?`)) return;
      const { error } = await supabase.rpc("admin_set_game_status", { p_game: g.id, p_status: "finished" });
      if (error) { alert(errText(error.message)); return; }
    } else {
      if (!confirm("Belum ada tangan yang dicatat di meja ini.\n\nHapus ruang ini lalu lepas meja?")) return;
      await supabase.from("games").delete().eq("id", g.id);   // best effort: only the game's owner may delete; the release below still runs
    }
    await call("admin_release_table", { p_table: r.id });
  }

  /** Delete the table itself. A running game is finished first (results saved) or, if nobody played, deleted; finished games stay in history. */
  async function removeTable(r: Row) {
    const g = r.games, label = `Meja ${String(r.table_number).padStart(2, "0")}`;
    if (!g || g.status === "finished") { if (!confirm(`Hapus ${label}? Meja hilang dari daftar. Riwayat game yang sudah selesai tetap tersimpan.`)) return; }
    else {
      const hands = g.game_hands?.[0]?.count ?? 0;
      if (hands > 0) {
        if (!confirm(`${label} masih punya game berjalan (${hands} tangan tercatat).\n\nAkhiri game, simpan hasilnya, lalu hapus meja?`)) return;
        const { error } = await supabase.rpc("admin_set_game_status", { p_game: g.id, p_status: "finished" });
        if (error) { alert(errText(error.message)); return; }
      } else {
        if (!confirm(`${label} punya ruang yang belum dimainkan.\n\nHapus ruang itu dan hapus meja?`)) return;
        const { error } = await supabase.from("games").delete().eq("id", g.id);
        if (error) { alert(errText(error.message)); return; }
      }
    }
    await call("admin_delete_table", { p_table: r.id });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addTable} className="space-y-2">
        <div className="flex gap-2">
          <input className="input max-w-[10rem]" type="number" min={1} step={1} placeholder="Table no." aria-label="Table no." value={num} onChange={(e) => { setNum(e.target.value); setNotice(null); }} />
          <button type="submit" className="btn-secondary max-w-[10rem]" disabled={adding}>{adding ? "Menambah…" : "Add table"}</button>
        </div>
        <p className="text-xs text-muted">Kosongkan nomor untuk menambah meja berikutnya.</p>
        {notice && <p role={notice.ok ? "status" : "alert"} className={`text-sm font-semibold ${notice.ok ? "text-pos" : "text-neg"}`}>{notice.text}</p>}
      </form>
      {loadError && <p role="alert" className="card text-sm text-neg">Gagal memuat daftar meja: {loadError}. Jika pesan ini menyebut kolom atau fungsi yang tidak ada, jalankan migrasi database terbaru (supabase/migration_002 sampai terbaru).</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((r) => {
          const g = r.games;
          const sorted = g ? [...g.game_players].sort((a, b) => b.current_score - a.current_score) : [];
          return (
            <article key={r.id} className="card space-y-3">
              <header className="flex items-baseline justify-between">
                <h2 className="text-xl font-extrabold">TABLE {String(r.table_number).padStart(2, "0")} 🀄</h2>
                <span className="text-sm">{STATUS_LABEL[r.status]}</span>
              </header>
              {g ? (<>
                <p className="text-sm text-muted">{g.setup_complete ? `${ROUND_NAME[g.current_round_wind]} · Hand ${(g.game_hands?.[0]?.count ?? 0) + 1} · ${ruleSummary(g)}` : "Menunggu pemain mengisi nama dan aturan"}</p>
                <RoomCode code={g.room_code} />
                {g.status !== "finished" && (
                  <div className="space-y-2">
                    {g.session_minutes ? <SessionClock startedAt={g.session_started_at} minutes={g.session_minutes} compact /> : <p className="text-xs text-muted">Tanpa jam bermain.</p>}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted">Tambah waktu:</span>
                      {[30, 60, 120].map((m) => <button key={m} className="btn-secondary btn-sm !min-h-[36px]" onClick={() => call("admin_set_session_minutes", { p_game: g.id, p_minutes: extendedTotal(g.session_minutes, g.session_started_at, m) })}>+{m === 30 ? "30 menit" : `${m / 60} jam`}</button>)}
                      <button className="text-xs text-muted underline" onClick={() => {
                        const v = prompt(`Total lama bermain dalam jam (sekarang ${g.session_minutes ? fmtMinutes(g.session_minutes) : "tanpa batas"}). Kosongkan untuk tanpa batas.`, g.session_minutes ? String(g.session_minutes / 60) : "");
                        if (v === null) return;
                        const h = Number(v.replace(",", "."));
                        if (v.trim() === "") call("admin_set_session_minutes", { p_game: g.id, p_minutes: null });
                        else if (Number.isFinite(h) && h > 0) call("admin_set_session_minutes", { p_game: g.id, p_minutes: Math.round(h * 60) });
                      }}>Atur…</button>
                    </div>
                  </div>)}
                <ul className="space-y-2">
                  {sorted.map((p, i) => (
                    <li key={p.id} className="flex items-center justify-between rounded-xl bg-base px-3 py-2">
                      <span className="font-semibold">{MEDALS[i]} {p.player_name}{p.seat_position === g.current_dealer_seat ? " 👑" : ""} <span className="text-xs text-muted">{WIND_NAME[seatWind(p.seat_position, g.current_dealer_seat)]}</span></span>
                      <span className="flex items-center gap-3 font-bold"><span className={scoreTone(p.current_score, false, g.starting_points)}>{fmtScore(p.current_score)}</span>
                        <button className="text-xs text-muted underline" onClick={() => {
                          const v = prompt(`New score for ${p.player_name}`, String(p.current_score));
                          if (v !== null && v.trim() !== "" && !Number.isNaN(Number(v))) call("admin_correct_score", { p_player: p.id, p_new: Math.round(Number(v)), p_reason: prompt("Reason (optional)") });
                        }}>Fix</button></span>
                    </li>))}
                </ul>
                <div className="grid grid-cols-3 gap-2">
                  {g.status === "paused" ? <button className="btn-secondary !min-h-[44px] !text-[15px] !px-2" onClick={() => call("admin_set_game_status", { p_game: g.id, p_status: "in_progress" })}>Resume</button>
                    : g.status === "in_progress" ? <button className="btn-secondary !min-h-[44px] !text-[15px] !px-2" onClick={() => call("admin_set_game_status", { p_game: g.id, p_status: "paused" })}>Pause</button> : <span />}
                  {g.status !== "finished" ? <button className="btn-secondary !min-h-[44px] !text-[15px] !px-2" onClick={() => confirm("Mark this game as finished?") && call("admin_set_game_status", { p_game: g.id, p_status: "finished" })}>Finish</button> : <span />}
                  <Link href={`/admin/games/${g.id}`} className="btn-secondary !min-h-[44px] !text-[15px] !px-2 whitespace-nowrap">Buka game</Link>
                  <button className="btn-secondary !min-h-[44px] !text-[15px] col-span-3 !px-2" onClick={() => release(r)}>Release</button>
                </div>
              </>) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted">Meja kosong. Buka ruang, lalu berikan kode ruang ke pemain.</p>
                  <Link href={`/admin/tables/open?table=${r.id}`} className="btn-primary">Buka ruang</Link>
                </div>)}
              <div className="border-t border-line/60 pt-3"><button className="text-xs font-semibold text-neg underline underline-offset-2" onClick={() => removeTable(r)}>Hapus meja</button></div>
            </article>);
        })}
      </div>
      {rows.length === 0 && <p className="card text-sm text-muted">No tables yet. Add table 1 to get started.</p>}
    </div>
  );
}
