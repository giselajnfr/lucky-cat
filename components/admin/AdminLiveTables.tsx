"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MEDALS, ROUND_NAME, STATUS_LABEL, WIND_NAME, seatWind } from "@/lib/tv/types";

type P = { id: string; player_name: string; seat_position: number; current_score: number };
type Row = { id: string; table_number: number; status: string; games: null | { id: string; room_code: string; status: string; current_round_wind: string; current_dealer_seat: number; game_players: P[]; game_hands: { count: number }[] } };

export function AdminLiveTables() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [num, setNum] = useState("");
  const [codes, setCodes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data } = await supabase.from("cafe_tables")
      .select("id, table_number, status, games(id, room_code, status, current_round_wind, current_dealer_seat, game_players(id, player_name, seat_position, current_score), game_hands(count))")
      .order("table_number");
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

  async function call(fn: string, args: Record<string, unknown>) {
    const { error } = await supabase.rpc(fn, args);
    if (error) alert(error.message); else load();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input className="input max-w-[10rem]" type="number" min={1} placeholder="Table no." value={num} onChange={(e) => setNum(e.target.value)} />
        <button className="btn-secondary max-w-[10rem]" onClick={() => num && call("admin_create_table", { p_number: Number(num) }).then(() => setNum(""))}>Add table</button>
      </div>
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
                <p className="text-sm text-muted">{ROUND_NAME[g.current_round_wind]} · Hand {(g.game_hands?.[0]?.count ?? 0) + 1} · Room <b className="tracking-widest text-cream">{g.room_code}</b></p>
                <ul className="space-y-2">
                  {sorted.map((p, i) => (
                    <li key={p.id} className="flex items-center justify-between rounded-xl bg-base px-3 py-2">
                      <span className="font-semibold">{MEDALS[i]} {p.player_name}{p.seat_position === g.current_dealer_seat ? " 👑" : ""} <span className="text-xs text-muted">{WIND_NAME[seatWind(p.seat_position, g.current_dealer_seat)]}</span></span>
                      <span className="flex items-center gap-3 font-bold">{p.current_score.toLocaleString("en-US")}
                        <button className="text-xs text-muted underline" onClick={() => {
                          const v = prompt(`New score for ${p.player_name}`, String(p.current_score));
                          if (v !== null && v.trim() !== "" && !Number.isNaN(Number(v))) call("admin_correct_score", { p_player: p.id, p_new: Math.round(Number(v)), p_reason: prompt("Reason (optional)") });
                        }}>Fix</button></span>
                    </li>))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  {g.status === "paused" ? <button className="btn-secondary !min-h-[44px] flex-1" onClick={() => call("admin_set_game_status", { p_game: g.id, p_status: "in_progress" })}>Resume</button>
                    : g.status === "in_progress" && <button className="btn-secondary !min-h-[44px] flex-1" onClick={() => call("admin_set_game_status", { p_game: g.id, p_status: "paused" })}>Pause</button>}
                  {g.status !== "finished" && <button className="btn-secondary !min-h-[44px] flex-1" onClick={() => confirm("Mark this game as finished?") && call("admin_set_game_status", { p_game: g.id, p_status: "finished" })}>Finish</button>}
                  <button className="btn-secondary !min-h-[44px] flex-1" onClick={() => confirm("Remove this game from the table?") && call("admin_release_table", { p_table: r.id })}>Release</button>
                </div>
              </>) : (
                <div className="flex gap-2">
                  <input className="input" placeholder="Room code" maxLength={4} value={codes[r.id] ?? ""} onChange={(e) => setCodes({ ...codes, [r.id]: e.target.value.toUpperCase() })} />
                  <button className="btn-secondary max-w-[8rem]" onClick={() => call("admin_assign_game", { p_table: r.id, p_code: codes[r.id] ?? "" })}>Assign</button>
                </div>)}
            </article>);
        })}
      </div>
      {rows.length === 0 && <p className="card text-sm text-muted">No tables yet. Add table 1 to get started.</p>}
    </div>
  );
}
