import { StatsView } from "@/components/game/StatsView";
import { createClient } from "@/lib/supabase/server";
import type { SGame, SHand, SPlayer } from "@/lib/stats/aggregate";

export const dynamic = "force-dynamic";
const PAGE = 1000; // PostgREST returns at most 1000 rows per request, so read in pages

/** Cafe-wide statistics: every finished game of every table (admins can read all rows). The "Pemain" filter replaces a separate Players page. */
export default async function Page() {
  const s = createClient();
  async function all<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
    const out: T[] = [];
    for (let i = 0; i < 30; i++) { const { data } = await read(i * PAGE, i * PAGE + PAGE - 1); if (!data?.length) break; out.push(...data); if (data.length < PAGE) break; }
    return out;
  }
  const [games, players, rows] = await Promise.all([
    all<SGame>((a, b) => s.from("games").select("id, played_at, created_at, finished_at, starting_points, name").eq("status", "finished").order("played_at").range(a, b)),
    all<SPlayer>((a, b) => s.from("game_players").select("id, game_id, player_id, player_name, seat_position, current_score, final_rank, games!inner(status)").eq("games.status", "finished").order("id").range(a, b) as never),
    all<Record<string, unknown>>((a, b) => s.from("game_hands").select("id, game_id, hand_number, winner_player_id, discard_player_id, winning_method, total_fan, final_points, created_at, hand_fan_details(fan_name, fan_id, category), games!inner(status)").eq("games.status", "finished").order("id").range(a, b) as never),
  ]);
  const hands = rows.map((x) => ({ ...x, fans: (x.hand_fan_details as unknown[]) ?? [] })) as unknown as SHand[];
  return (
    <main>
      <h1 className="text-3xl font-extrabold">Statistics</h1>
      <p className="mt-1 text-sm text-muted">Semua meja, dari game yang sudah selesai. Pilih pemain untuk melihat angka per orang.</p>
      <StatsView games={games} players={players} hands={hands} historyHref={(id) => `/admin/games/${id}/history`} />
    </main>
  );
}
