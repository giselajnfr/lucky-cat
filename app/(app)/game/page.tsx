import Link from "next/link";
import { GameCard, type GameCardData } from "@/components/game/GameCard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = searchParams.tab === "selesai" ? "selesai" : "berlangsung";
  const s = createClient();
  const { data: { user } } = await s.auth.getUser();
  const { data: prof } = user ? await s.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  const isAdmin = prof?.role === "ADMIN";
  // RLS: only games this user owns or has joined.
  const { data } = await s.from("games")
    .select("id, name, room_code, status, owner_id, played_at, finished_at, setup_complete, starting_points, current_round_wind, game_players(player_name, current_score), game_hands(count)")
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
        <ul className="space-y-3">{list.map((g) => <li key={g.id}><GameCard g={g as unknown as GameCardData} /></li>)}</ul>
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
