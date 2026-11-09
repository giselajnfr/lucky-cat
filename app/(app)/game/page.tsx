import Link from "next/link";
import { fmtScore, scoreTone } from "@/lib/ui/score";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const ROUND = { east: "Timur", south: "Selatan", west: "Barat", north: "Utara" } as const;
type P = { player_name: string; current_score: number };

export default async function Page({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = searchParams.tab === "selesai" ? "selesai" : "berlangsung";
  const s = createClient();
  const { data: { user } } = await s.auth.getUser();
  const { data: prof } = user ? await s.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  const isAdmin = prof?.role === "ADMIN";
  // RLS: only games this user owns or has joined.
  const { data } = await s.from("games")
    .select("id, name, room_code, status, owner_id, played_at, setup_complete, starting_points, current_round_wind, game_players(player_name, current_score), game_hands(count)")
    .order("played_at", { ascending: false });
  const all = data ?? [];
  const live = all.filter((g) => g.status !== "finished"), done = all.filter((g) => g.status === "finished");
  const list = tab === "selesai" ? done : live;

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[1.75rem]">Game</h1>
        <div className="flex gap-2">
          {isAdmin && <Link href="/admin/tables" className="btn-secondary btn-sm">Buka meja</Link>}
          <Link href="/game/join" className="btn-primary btn-sm">Gabung</Link>
        </div>
      </div>

      <nav className="seg" aria-label="Filter game">
        <Link href="/game" className={`seg-item ${tab === "berlangsung" ? "seg-on" : ""}`} aria-current={tab === "berlangsung" ? "page" : undefined}>Berlangsung ({live.length})</Link>
        <Link href="/game?tab=selesai" className={`seg-item ${tab === "selesai" ? "seg-on" : ""}`} aria-current={tab === "selesai" ? "page" : undefined}>Selesai ({done.length})</Link>
      </nav>

      {list.length ? (
        <ul className="space-y-3">{list.map((g) => {
          const ps = [...(g.game_players as P[])].sort((a, b) => b.current_score - a.current_score);
          const hands = (g.game_hands as unknown as { count: number }[])?.[0]?.count ?? 0;
          const fin = g.status === "finished", viewer = g.owner_id !== user?.id;
          return (
            <li key={g.id}><Link href={fin ? `/history/${g.id}` : `/game/${g.id}`} className={`card block ${fin ? "" : "!border-l-4 " + (g.status === "paused" ? "!border-l-warn" : "!border-l-pos")}`}>
              <div className="flex items-start justify-between gap-2">
                <b>{g.name || `Game ${g.room_code}`}</b>
                <span className="flex shrink-0 items-center gap-2 text-xs font-bold">
                  {viewer && <span className="rounded-full border border-line px-2 py-0.5 font-semibold text-muted">Bergabung</span>}
                  <span className={fin ? "text-muted" : g.status === "paused" ? "text-warn" : "text-pos"}>{fin ? "Selesai" : g.status === "paused" ? "Dijeda" : "Berlangsung"}</span>
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted">{new Date(g.played_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} · {hands} tangan{fin || !g.setup_complete ? "" : ` · Ronde ${ROUND[g.current_round_wind as keyof typeof ROUND]}`} · {g.room_code}</p>
              {!g.setup_complete ? <p className="mt-2 text-sm text-muted">Belum dimulai. Isi nama pemain dan pilih aturan meja.</p> : <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">{ps.map((p) => <span key={p.player_name}>{p.player_name} <b className={scoreTone(p.current_score, false, g.starting_points)}>{fmtScore(p.current_score)}</b></span>)}</p>}
              <p className="mt-2 text-xs font-bold">{fin ? "Lihat ringkasan →" : g.setup_complete ? "Lanjutkan →" : "Atur meja →"}</p>
            </Link></li>);
        })}</ul>
      ) : tab === "selesai" ? (
        <p className="card text-sm text-muted">Belum ada game selesai.</p>
      ) : (
        <div className="card space-y-3 text-center">
          <p className="text-sm text-muted">Tidak ada game yang sedang berlangsung.</p>
          <Link href="/game/join" className="btn-primary">Gabung dengan kode</Link>
          {isAdmin && <Link href="/admin/tables" className="btn-ghost">Buka meja baru</Link>}
        </div>
      )}
    </main>
  );
}
