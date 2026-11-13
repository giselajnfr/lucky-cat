import Link from "next/link";
import { LogoMark } from "@/components/ui/LogoMark";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { GameCard, type GameCardData } from "@/components/game/GameCard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name: string = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "teman";
  const { data: prof } = user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  const isAdmin = prof?.role === "ADMIN";

  // RLS limits both queries to games the user owns or has joined.
  const cols = "id, name, room_code, status, setup_complete, current_round_wind, starting_points, played_at, finished_at, game_players(player_name, current_score), game_hands(count)";
  const [{ data: live }, { data: done }] = await Promise.all([
    supabase.from("games").select(cols).neq("status", "finished").order("played_at", { ascending: false }).limit(3),
    supabase.from("games").select(cols).eq("status", "finished").order("finished_at", { ascending: false }).limit(2),
  ]);
  const liveGames = (live ?? []) as unknown as GameCardData[], doneGames = (done ?? []) as unknown as GameCardData[];

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5"><LogoMark size="36px" /><span className="text-sm font-bold">Lucky Cat Mahjong</span></div>
        <div className="flex items-center gap-2">
          {isAdmin && <Link href="/admin" className="rounded-full border border-warn px-3 py-1.5 text-xs font-bold text-warn">Admin</Link>}
          <AccountMenu name={name} email={user?.email} />
        </div>
      </header>

      <div>
        <h1 className="text-[1.75rem] leading-tight">Halo, {name}!</h1>
        <p className="mt-0.5 text-sm text-muted">Mau main mahjong hari ini?</p>
      </div>

      {/* One primary action; the other two are clearly secondary. */}
      <section className="space-y-3" aria-label="Mulai">
        <Link href="/game/join" className="btn-primary !min-h-[60px]">Gabung dengan kode</Link>
        <div className={`grid gap-3 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
          <Link href="/quick-score" className="btn-secondary">Hitung skor cepat</Link>
          {isAdmin && <Link href="/admin/tables" className="btn-secondary !border-warn !text-warn">Buka meja (admin)</Link>}
        </div>
        <p className="text-xs text-muted">Minta kode ruang dari staf di meja kamu, lalu masukkan di sini.</p>
      </section>

      <section aria-label="Game berlangsung">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="section-label">Sedang berlangsung</h2>
          <Link href="/game" className="text-xs font-semibold text-muted underline">Semua</Link>
        </div>
        {liveGames.length ? <ul className="space-y-3">{liveGames.map((g) => <li key={g.id}><GameCard g={g} /></li>)}</ul>
          : <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">Tidak ada game yang sedang berlangsung. Gabung dengan kode untuk mulai.</p>}
      </section>

      <section aria-label="Game selesai" className="mt-2">
        <div className="mb-3 flex items-baseline justify-between"><h2 className="section-label">Selesai</h2><Link href="/game?tab=selesai" className="text-xs font-semibold text-muted underline">Lihat semua</Link></div>
        {doneGames.length ? <ul className="space-y-2">{doneGames.map((g) => <li key={g.id}><GameCard g={g} /></li>)}</ul>
          : <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">Belum ada game selesai. Hasilnya muncul di sini setelah game berakhir.</p>}
      </section>
    </main>
  );
}
