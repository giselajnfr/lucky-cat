import Link from "next/link";
import { LogoMark } from "@/components/ui/LogoMark";
import { fmtScore, scoreTone } from "@/lib/ui/score";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const ROUND = { east: "Timur", south: "Selatan", west: "Barat", north: "Utara" } as const;
type P = { player_name: string; current_score: number };
const byScore = (a: P, b: P) => b.current_score - a.current_score;

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name: string = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "teman";
  const { data: prof } = user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  const isAdmin = prof?.role === "ADMIN";

  // RLS limits both queries to games the user owns or has joined.
  const [{ data: live }, { data: last }] = await Promise.all([
    supabase.from("games").select("id, name, room_code, status, current_round_wind, game_players(player_name, current_score)")
      .neq("status", "finished").order("played_at", { ascending: false }).limit(2),
    supabase.from("games").select("id, game_players(player_name, current_score)")
      .eq("status", "finished").order("finished_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const lastPlayers = [...((last?.game_players ?? []) as P[])].sort(byScore).slice(0, 4);

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5"><LogoMark size="36px" /><span className="text-sm font-bold">Lucky Cat Mahjong</span></div>
        <div className="flex items-center gap-2">
          {isAdmin && <Link href="/admin" className="rounded-full border border-warn px-3 py-1.5 text-xs font-bold text-warn">Admin</Link>}
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card font-bold" aria-label={name}>{name[0]?.toUpperCase()}</span>
        </div>
      </header>

      <div>
        <h1 className="text-[1.75rem] leading-tight">Halo, {name}!</h1>
        <p className="mt-0.5 text-sm text-muted">Mau main mahjong hari ini?</p>
      </div>

      {/* One primary action; the other two are clearly secondary. */}
      <section className="space-y-3" aria-label="Mulai">
        <Link href="/game/join" className="btn-primary !min-h-[60px] text-lg">Gabung dengan kode</Link>
        <div className={`grid gap-3 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
          <Link href="/quick-score" className="btn-secondary">Hitung skor cepat</Link>
          {isAdmin && <Link href="/admin/tables" className="btn-secondary !border-warn !text-warn">Buka meja (admin)</Link>}
        </div>
        <p className="text-xs text-muted">Minta kode ruang dari staf di meja kamu, lalu masukkan di sini.</p>
      </section>

      {live?.length ? (
        <section>
          <div className="mb-3 flex items-baseline justify-between"><h2 className="section-label">Sedang berlangsung</h2><Link href="/game" className="text-xs font-semibold underline">Semua</Link></div>
          <ul className="space-y-3">{live.map((g) => (
            <li key={g.id}><Link href={`/game/${g.id}`} className="card block !border-l-4 !border-l-pos">
              <div className="flex items-start justify-between gap-2">
                <b>{g.name || `Game ${g.room_code}`}</b>
                <span className={`shrink-0 text-xs font-bold ${g.status === "paused" ? "text-warn" : "text-pos"}`}>{g.status === "paused" ? "Dijeda" : `Ronde ${ROUND[g.current_round_wind as keyof typeof ROUND]}`}</span>
              </div>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">{[...(g.game_players as P[])].sort(byScore).map((p) => (
                <span key={p.player_name}>{p.player_name} <b className={scoreTone(p.current_score)}>{fmtScore(p.current_score)}</b></span>))}</p>
              <p className="mt-2 text-xs font-bold">Lanjutkan →</p>
            </Link></li>))}</ul>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-baseline justify-between"><h2 className="section-label">Game terakhir</h2><Link href="/game?tab=selesai" className="text-xs font-semibold underline">Lihat semua</Link></div>
        {lastPlayers.length ? (
          <Link href={`/history/${last!.id}`}><ol className="grid grid-cols-4 gap-2">{lastPlayers.map((p, i) => (
            <li key={p.player_name} className={`rounded-xl border px-2 py-2.5 text-center ${i === 0 ? "border-cream bg-cream text-base" : "border-line bg-card"}`}>
              <p className={`text-[10px] ${i === 0 ? "text-base/70" : "text-muted"}`}>{i + 1}</p>
              <p className="truncate text-sm font-bold">{p.player_name}</p>
              <p className={`text-[11px] font-bold ${scoreTone(p.current_score, i === 0) || (i === 0 ? "text-base/70" : "text-muted")}`}>{fmtScore(p.current_score)}</p>
            </li>))}</ol></Link>
        ) : <p className="card text-sm text-muted">Belum ada game selesai. Hasilnya muncul di sini setelah game pertama berakhir.</p>}
      </section>
    </main>
  );
}
