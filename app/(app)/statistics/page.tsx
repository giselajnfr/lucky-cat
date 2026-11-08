import { StatsView } from "@/components/game/StatsView";
import { createClient } from "@/lib/supabase/server";
import type { SGame, SHand, SPlayer } from "@/lib/stats/aggregate";

export const dynamic = "force-dynamic";

export default async function Page() {
  const s = createClient();
  // Only COMPLETED games feed the statistics; RLS limits rows to games the user owns or joined.
  const { data: games } = await s.from("games").select("id, played_at, created_at, finished_at, starting_points, name").eq("status", "finished").order("played_at");
  const ids = (games ?? []).map((g) => g.id);
  const [p, h] = ids.length
    ? await Promise.all([
        s.from("game_players").select("id, game_id, player_id, player_name, seat_position, current_score, final_rank").in("game_id", ids),
        s.from("game_hands").select("id, game_id, hand_number, winner_player_id, discard_player_id, winning_method, total_fan, final_points, created_at, hand_fan_details(fan_name, fan_id, category)").in("game_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const hands: SHand[] = (h.data ?? []).map((x: any) => ({ ...x, fans: x.hand_fan_details ?? [] })); // eslint-disable-line @typescript-eslint/no-explicit-any
  return (<main><h1 className="text-[1.75rem]">Statistik</h1><p className="mt-1 text-sm text-muted">Dihitung dari game yang sudah selesai.</p>
    <StatsView games={(games ?? []) as SGame[]} players={(p.data ?? []) as SPlayer[]} hands={hands} /></main>);
}
