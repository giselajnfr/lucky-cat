import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const dur = (a: string, b: string | null) => { if (!b) return null; const m = Math.round((+new Date(b) - +new Date(a)) / 60000); return m >= 60 ? `${Math.floor(m / 60)} j ${m % 60} m` : `${m} m`; };

export default async function Page() {
  const s = createClient();
  const { data: games } = await s.from("games").select("id, name, room_code, status, played_at, created_at, finished_at, game_players(id, player_name, current_score, final_rank), game_hands(id, winner_player_id)").order("played_at", { ascending: false });
  return (
    <main>
      <h1 className="text-[1.75rem]">Riwayat game</h1>
      {games?.length ? (
        <ul className="mt-4 space-y-3">{games.map((g) => {
          const ps = [...(g.game_players ?? [])].sort((a, b) => b.current_score - a.current_score);
          const hands = g.game_hands?.length ?? 0, top = ps[0];
          const fin = g.status === "finished";
          return (<li key={g.id}><Link href={fin ? `/history/${g.id}` : `/game/${g.id}`} className="card block">
            <div className="flex items-start justify-between gap-2"><b>{g.name || `Game ${g.room_code}`}</b><span className={`shrink-0 text-xs ${fin ? "text-muted" : "font-bold text-cream"}`}>{fin ? "Selesai" : g.status === "paused" ? "Dijeda" : "Berlangsung"}</span></div>
            <p className="text-xs text-muted">{new Date(g.played_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}{fin && dur(g.created_at, g.finished_at) ? ` · ${dur(g.created_at, g.finished_at)}` : ""} · {hands} tangan</p>
            <p className="mt-2 text-sm">{ps.map((p) => `${p.player_name} ${p.current_score}`).join(" · ")}</p>
            {top && hands > 0 && <p className="mt-1 text-xs text-muted">{fin ? "Pemenang" : "Memimpin"}: <b className="text-cream">{top.player_name}</b></p>}
            {!fin && <p className="mt-2 text-xs font-bold underline">Lanjutkan</p>}</Link></li>);
        })}</ul>
      ) : <p className="card mt-4 text-sm text-muted">Belum ada game. <Link href="/game/new" className="underline">Mulai game baru</Link></p>}
    </main>
  );
}
