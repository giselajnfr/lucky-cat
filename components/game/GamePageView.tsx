import { notFound } from "next/navigation";
import { GameDashboard } from "@/components/game/GameDashboard";
import { createClient } from "@/lib/supabase/server";
import type { GamePlayerRow, GameRow, HandRow } from "@/lib/game/types";

/** The game screen (scores, record a hand, edit hands). Shared by the user app (/game/[id]) and admin mode (/admin/games/[id]); only the back link differs. */
export async function GamePageView({ id, backHref, backLabel }: { id: string; backHref: string; backLabel: string }) {
  const s = createClient();
  const { data: { user } } = await s.auth.getUser();
  const [g, p, h] = await Promise.all([
    s.from("games").select("*").eq("id", id).maybeSingle(),
    s.from("game_players").select("*").eq("game_id", id).order("seat_position"),
    s.from("game_hands").select("*, hand_fan_details(fan_name, fan_value, fan_id, category)").eq("game_id", id).order("hand_number"),
  ]);
  if (!g.data) notFound();   // RLS hides games the user cannot access
  const [{ data: canPlay }, { data: prof }] = await Promise.all([
    s.rpc("can_play_game", { gid: id }),
    user ? s.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canManage = g.data.owner_id === user?.id || prof?.role === "ADMIN";
  return <GameDashboard initial={{ game: g.data as GameRow, players: (p.data ?? []) as GamePlayerRow[], hands: (h.data ?? []) as HandRow[] }} canPlay={!!canPlay} canManage={canManage} backHref={backHref} backLabel={backLabel} />;
}
