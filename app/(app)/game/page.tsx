import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const ROUND = { east: "Timur", south: "Selatan", west: "Barat", north: "Utara" } as const;

export default async function Page() {
  const s = createClient();
  const { data: games } = await s.from("games").select("id, name, room_code, status, played_at, current_round_wind, game_players(player_name, seat_position, current_score), game_hands(count)")
    .neq("status", "finished").order("created_at", { ascending: false });
  return (
    <main className="space-y-5">
      <h1 className="text-[1.75rem]">Game</h1>
      <Link href="/game/new" className="btn-primary">Mulai game baru</Link>
      <div className="grid grid-cols-2 gap-3"><Link href="/quick-score" className="btn-secondary">Hitung skor cepat</Link><Link href="/guidebook" className="btn-secondary">Aturan HK18</Link></div>
      <Link href="/history" className="btn-secondary">Riwayat game</Link>
      <section>
        <h2 className="section-label mb-3">Game yang belum selesai</h2>
        {games?.length ? (
          <ul className="space-y-3">{games.map((g) => {
            const ps = [...(g.game_players ?? [])].sort((a, b) => b.current_score - a.current_score);
            const hands = (g.game_hands as unknown as { count: number }[])?.[0]?.count ?? 0;
            return (<li key={g.id}><Link href={`/game/${g.id}`} className="card block">
              <div className="flex justify-between"><b>{g.name || `Game ${g.room_code}`}</b><span className="text-xs text-muted">{g.status === "paused" ? "Dijeda" : "Berlangsung"}</span></div>
              <p className="text-xs text-muted">Ronde {ROUND[g.current_round_wind as keyof typeof ROUND]} · {hands} tangan · {new Date(g.played_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
              <p className="mt-2 text-sm">{ps.map((p) => `${p.player_name} ${p.current_score}`).join(" · ")}</p>
              <p className="mt-2 text-xs font-bold underline">Lanjutkan</p></Link></li>);
          })}</ul>
        ) : <p className="card text-sm text-muted">Tidak ada game yang sedang berjalan.</p>}
      </section>
    </main>
  );
}
