"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { WIND_LABEL } from "@/components/calculator/HandCalculator";
import { RecordHand } from "./RecordHand";
import { BackLink } from "@/components/layout/BackLink";
import { RoomCode } from "./RoomCode";
import { HandTiles } from "@/components/mahjong/HandTiles";
import { fmtScore, scoreTone } from "@/lib/ui/score";
import { ROUND_TO_WIND, seatWindOf } from "@/lib/game-engine";
import type { FanDetailRow, GamePlayerRow, GameRow, HandRow } from "@/lib/game/types";

type Full = { game: GameRow; players: GamePlayerRow[]; hands: HandRow[] };
const ROUND_LABEL = { east: "Timur", south: "Selatan", west: "Barat", north: "Utara" };
const STATUS = { in_progress: "Sedang berlangsung", paused: "Dijeda", finished: "Selesai" };
const METHOD = { self_draw: "Self Draw", discard: "Dari buangan", draw: "Seri" };

/** canPlay: record, edit and undo hands (admin who opened the table, other admins, anyone who joined with the room code). canManage: also pause and finish (owner or admin). */
export function GameDashboard({ initial, canPlay, canManage }: { initial: Full; canPlay: boolean; canManage: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [d, setD] = useState<Full>(initial);
  const [recording, setRecording] = useState(false);
  const [editing, setEditing] = useState<HandRow | null>(null);
  const [confirm, setConfirm] = useState<null | "finish" | "undo">(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const gid = initial.game.id;

  const load = useCallback(async () => {
    const [g, p, h] = await Promise.all([
      supabase.from("games").select("*").eq("id", gid).single(),
      supabase.from("game_players").select("*").eq("game_id", gid).order("seat_position"),
      supabase.from("game_hands").select("*, hand_fan_details(fan_name, fan_value, fan_id, category)").eq("game_id", gid).order("hand_number"),
    ]);
    if (g.data && p.data && h.data) setD({ game: g.data as GameRow, players: p.data as GamePlayerRow[], hands: h.data as HandRow[] });
  }, [supabase, gid]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const soon = () => { clearTimeout(t); t = setTimeout(load, 250); };
    const ch = supabase.channel(`game-${gid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${gid}` }, soon)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `game_id=eq.${gid}` }, soon)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_hands", filter: `game_id=eq.${gid}` }, soon)
      .subscribe();
    return () => { clearTimeout(t); supabase.removeChannel(ch); };
  }, [supabase, gid, load]);

  const { game, players, hands } = d;
  const finished = game.status === "finished";
  const wins = (id: string) => hands.filter((h) => h.winner_player_id === id).length;
  const top = Math.max(...players.map((p) => p.current_score));
  const dealer = players.find((p) => p.seat_position === game.current_dealer_seat);
  const leaders = players.filter((p) => p.current_score === top);
  const lastOver = hands.length > 0 && hands[hands.length - 1].hand_detail?.game_over === true;
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.player_name ?? "—";

  async function rpc(fn: string, args: Record<string, unknown>) {
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc(fn, args);
    if (error) setMsg(error.message); setConfirm(null); setBusy(false); await load();
  }

  return (
    <main className="space-y-4">
      <BackLink href="/game" label="Game" />
      <header>
        <div className="flex items-start justify-between gap-3">
          <div><h1 className="text-[1.6rem] leading-tight">{game.name || `Game ${game.room_code}`}</h1>
            <p className="text-xs text-muted">HK18 · min {game.min_fan} faan · {new Date(game.played_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</p></div>
          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${finished ? "border-line text-muted" : game.status === "paused" ? "border-warn text-warn" : "border-pos text-pos"}`}>{STATUS[game.status]}</span>
        </div>
      </header>
      <RoomCode code={game.room_code} />

      <section className="grid grid-cols-3 gap-2 text-center">
        <div className="card !p-3"><p className="text-[11px] text-muted">Ronde</p><p className="font-extrabold">{ROUND_LABEL[game.current_round_wind]}</p></div>
        <div className="card !p-3"><p className="text-[11px] text-muted">Tangan</p><p className="font-extrabold">{finished ? hands.length : hands.length + 1}</p></div>
        <div className="card !p-3"><p className="text-[11px] text-muted">Dealer</p><p className="truncate font-extrabold">{dealer?.player_name}</p></div>
      </section>

      <section aria-label="Papan skor" className="grid grid-cols-2 gap-3">
        {players.map((p) => {
          const lead = leaders.some((l) => l.id === p.id) && hands.length > 0;
          const isDealer = p.seat_position === game.current_dealer_seat;   // the only highlighted card
          return (
            <div key={p.id} className={`rounded-2xl border p-4 ${isDealer ? "border-cream bg-cream text-base" : "border-line bg-card"}`}>
              <div className={`flex items-center justify-between text-xs ${isDealer ? "text-base/70" : "text-muted"}`}>
                <span>{WIND_LABEL[seatWindOf(p.seat_position, game.current_dealer_seat)]}</span>{isDealer && <b>Dealer</b>}
              </div>
              <p className="mt-1 truncate text-lg font-bold">{p.player_name}</p>
              <p className={`text-3xl font-extrabold leading-tight ${scoreTone(p.current_score, isDealer)}`}>{fmtScore(p.current_score)}</p>
              <p className={`text-xs ${isDealer ? "text-base/70" : "text-muted"}`}>{wins(p.id)} menang{finished && p.final_rank ? ` · Peringkat ${p.final_rank}` : lead ? " · Memimpin" : ""}</p>
            </div>
          );
        })}
      </section>
      <p className="text-sm text-muted">Total poin beredar: {players.reduce((s, p) => s + p.current_score, 0)} · {hands.length} tangan dimainkan</p>

      {lastOver && !finished && <p className="card border-cream text-sm">Ronde terakhir sudah selesai. Kamu bisa mengakhiri game sekarang atau terus bermain.</p>}
      {msg && <p role="alert" className="text-sm font-semibold text-neg">{msg}</p>}

      {canPlay && !finished && (
        <div className="space-y-2">
          {game.status === "in_progress" ? <button className="btn-primary" onClick={() => setRecording(true)}>Catat tangan</button>
            : canManage ? <button className="btn-primary" disabled={busy} onClick={() => rpc("set_game_paused", { p_game: gid, p_paused: false })}>Lanjutkan game</button>
            : <p className="card text-sm text-warn">Game sedang dijeda. Minta admin untuk melanjutkan.</p>}
          <div className={`grid gap-2 ${canManage ? "grid-cols-3" : "grid-cols-1"}`}>
            <button className="btn-secondary" disabled={busy || hands.length === 0} onClick={() => setConfirm("undo")}>Batalkan tangan</button>
            {canManage && <button className="btn-secondary" disabled={busy || game.status !== "in_progress"} onClick={() => rpc("set_game_paused", { p_game: gid, p_paused: true })}>Jeda</button>}
            {canManage && <button className="btn-secondary !border-neg !text-neg" disabled={busy} onClick={() => setConfirm("finish")}>Akhiri</button>}
          </div>
        </div>
      )}
      {!canPlay && <p className="text-xs text-muted">Kamu hanya bisa melihat game ini.</p>}

      <section>
        <div className="mb-2 flex items-baseline justify-between"><h2 className="section-label">Riwayat tangan</h2><Link href="/guidebook" className="text-xs font-semibold underline">Aturan HK18</Link></div>
        {hands.length === 0 ? <p className="card text-sm text-muted">Belum ada tangan. Catat tangan pertama saat ada yang menang.</p> : (
          <ol className="space-y-2">{[...hands].reverse().map((h) => (
            <li key={h.id} className="card !p-3 text-sm">
              <div className="flex items-center justify-between gap-2"><b>#{h.hand_number} · {h.winner_player_id ? nameOf(h.winner_player_id) : "Seri"}{h.edited_at && <span className="ml-2 text-[11px] font-semibold text-warn">diubah</span>}</b>
                <span className="flex items-center gap-1"><b>{h.winner_player_id ? `${h.total_fan} faan` : "0"}</b>{canPlay && !finished && <button type="button" className="btn-ghost !min-h-[36px] !px-2 text-xs !text-cream underline" onClick={() => setEditing(h)}>Ubah</button>}</span></div>
              <p className="text-xs text-muted">{METHOD[h.winning_method]}{h.discard_player_id ? ` · dibuang ${nameOf(h.discard_player_id)}` : ""} · Ronde {ROUND_LABEL[h.round_wind as keyof typeof ROUND_LABEL]}</p>
              <div className="mt-2"><HandTiles detail={h.hand_detail} tiles={h.hand_tiles} width={20} /></div>
              {h.hand_fan_details?.length ? <p className="mt-2 text-xs text-muted">{h.hand_fan_details.map((f: FanDetailRow) => `${f.fan_name} +${f.fan_value}`).join(" · ")}</p> : null}
            </li>))}</ol>)}
      </section>

      {recording && <RecordHand game={game} players={players} handsPlayed={hands.length} onCancel={() => setRecording(false)} onDone={async () => { setRecording(false); await load(); }} />}
      {editing && <RecordHand key={editing.id} edit={editing} game={game} players={players} handsPlayed={hands.length} onCancel={() => setEditing(null)} onDone={async () => { setEditing(null); await load(); }} />}

      {confirm && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 sm:items-center" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-5">
            <h2 className="text-lg">{confirm === "finish" ? "Akhiri game ini?" : `Batalkan tangan #${hands.length}?`}</h2>
            <p className="mt-1 text-sm text-muted">{confirm === "finish" ? "Skor akhir dan peringkat disimpan. Game yang sudah selesai tidak bisa diubah lagi." : "Skor, dealer, dan ronde dikembalikan seperti sebelum tangan itu."}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn-secondary" onClick={() => setConfirm(null)}>Kembali</button>
              <button className="btn-danger" disabled={busy} onClick={() => rpc(confirm === "finish" ? "finish_game" : "undo_last_hand", { p_game: gid })}>{confirm === "finish" ? "Akhiri" : "Batalkan"}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
