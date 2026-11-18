import { errText } from "@/lib/i18n/errors";
import { appLocale } from "@/lib/i18n/locale";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ruleSummary } from "@/lib/game/presets";

export const dynamic = "force-dynamic";
const FILTERS = [["all", "Semua"], ["live", "Berlangsung"], ["finished", "Selesai"]] as const;
const dt = (iso: string) => new Date(iso).toLocaleString(appLocale(), { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

type Row = { id: string; name: string | null; room_code: string; status: string; setup_complete: boolean; played_at: string; finished_at: string | null;
  rule_preset: "chicken" | "beginner" | "advanced"; min_fan: number; max_fan: number | null; ruleset?: string; game_players: { player_name: string; current_score: number }[]; game_hands: { count: number }[] };

/** Every game of the cafe (admins can read all of them): find a game, see who played and open its full history. */
export default async function Page({ searchParams }: { searchParams?: { f?: string } }) {
  const f = FILTERS.some(([id]) => id === searchParams?.f) ? searchParams!.f! : "all";
  const s = createClient();
  let q = s.from("games").select("id, name, room_code, status, setup_complete, played_at, finished_at, rule_preset, min_fan, max_fan, ruleset, game_players(player_name, current_score), game_hands(count)")
    .order("played_at", { ascending: false }).limit(100);
  if (f === "finished") q = q.eq("status", "finished");
  if (f === "live") q = q.neq("status", "finished");
  const { data, error } = await q;
  const games = (data ?? []) as unknown as Row[];
  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-extrabold">Games</h1>
      <div className="flex gap-2" role="group" aria-label="Filter game">
        {FILTERS.map(([id, label]) => <Link key={id} href={`/admin/games?f=${id}`} aria-current={f === id ? "true" : undefined}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${f === id ? "border-cream bg-cream text-base" : "border-line bg-card text-cream"}`}>{label}</Link>)}
      </div>
      {error && <p className="card text-sm text-neg">{errText(error.message)}</p>}
      {games.length === 0 && !error ? <p className="card text-sm text-muted">Belum ada game.</p> : (
        <ul className="space-y-2">
          {games.map((g) => {
            const finished = g.status === "finished";
            const ps = [...g.game_players].sort((a, b) => b.current_score - a.current_score);
            const state = finished ? "Selesai" : g.status === "paused" ? "Dijeda" : !g.setup_complete ? "Menunggu pemain" : "Berlangsung";
            return (
              <li key={g.id}>
                <Link href={finished ? `/admin/games/${g.id}/history` : `/admin/games/${g.id}`} className="card flex flex-col gap-1 transition hover:bg-card/80 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="font-bold">{g.name || `Game ${g.room_code}`} <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${finished ? "bg-base text-muted" : "bg-pos/20 text-pos"}`}>{state}</span></p>
                    <p className="truncate text-sm text-muted">{ps.length ? ps.map((p) => p.player_name).join(", ") : "Belum ada pemain"}</p>
                  </div>
                  <div className="shrink-0 text-sm text-muted md:text-right">
                    <p>{ruleSummary(g)}</p>
                    <p>{g.game_hands?.[0]?.count ?? 0} tangan · {dt(g.finished_at ?? g.played_at)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {games.length === 100 && <p className="text-xs text-muted">Menampilkan 100 game terbaru.</p>}
    </main>
  );
}
