import Link from "next/link";
import { LogoMark } from "@/components/ui/LogoMark";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name: string = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "teman";
  // RLS limits this to games the user owns or has joined.
  const { data: latest } = await supabase.from("games")
    .select("id, room_code, status, game_players(player_name, current_score)")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  const players = [...(latest?.game_players ?? [])].sort((a, b) => b.current_score - a.current_score).slice(0, 4);

  return (
    <main className="space-y-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5"><LogoMark size="36px" /><span className="text-sm font-bold">Lucky Cat Mahjong</span></div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card font-bold" aria-label={name}>{name[0]?.toUpperCase()}</span>
      </header>

      <div>
        <h1 className="text-[1.75rem] leading-tight">Halo, {name}!</h1>
        <p className="mt-0.5 text-sm text-muted">Mau main mahjong hari ini?</p>
      </div>

      <section className="flex flex-col items-center gap-4 rounded-3xl border border-line bg-card p-4">
        <LogoMark size="132px" />
        <Link href="/game" className="btn-primary">Mulai game baru</Link>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/quick-score" className="btn-secondary">Hitung skor cepat</Link>
        <Link href="/game" className="btn-secondary">Lanjutkan game</Link>
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="section-label">Game terakhir</h2>
          <Link href="/history" className="text-xs font-semibold underline">Lihat semua</Link>
        </div>
        {players.length ? (
          <>
            <ol className="grid grid-cols-4 gap-2">
              {players.map((p, i) => (
                <li key={i} className={`rounded-xl border px-2 py-2.5 text-center ${i === 0 ? "border-cream bg-cream text-base" : "border-line bg-card"}`}>
                  <p className={`text-[10px] ${i === 0 ? "text-base/70" : "text-muted"}`}>{i + 1}</p>
                  <p className="truncate text-sm font-bold">{p.player_name}</p>
                  <p className={`text-[11px] ${i === 0 ? "text-base/70" : "text-muted"}`}>{p.current_score.toLocaleString("id-ID")}</p>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-muted">Ruang {latest?.room_code} · {latest?.status === "finished" ? "Selesai" : "Sedang berlangsung"}</p>
          </>
        ) : (
          <p className="card text-sm text-muted">Belum ada game. Mulai game baru untuk melihat hasilnya di sini.</p>
        )}
      </section>
    </main>
  );
}
