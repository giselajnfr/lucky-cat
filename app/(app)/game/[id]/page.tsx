import { notFound } from "next/navigation";
import { GameDashboard } from "@/components/game/GameDashboard";
import { createClient } from "@/lib/supabase/server";
import type { GamePlayerRow, GameRow, HandRow } from "@/lib/game/types";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const s = createClient();
  const { data: { user } } = await s.auth.getUser();
  const [g, p, h] = await Promise.all([
    s.from("games").select("*").eq("id", params.id).maybeSingle(),
    s.from("game_players").select("*").eq("game_id", params.id).order("seat_position"),
    s.from("game_hands").select("*, hand_fan_details(fan_name, fan_value, fan_id, category)").eq("game_id", params.id).order("hand_number"),
  ]);
  if (!g.data) notFound();   // RLS hides games the user cannot access
  return <GameDashboard initial={{ game: g.data as GameRow, players: (p.data ?? []) as GamePlayerRow[], hands: (h.data ?? []) as HandRow[] }} isOwner={g.data.owner_id === user?.id} />;
}
