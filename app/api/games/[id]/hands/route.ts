import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildHandRecord, type SeatedPlayer } from "@/lib/game-engine";
import { configForGame, stateOfGame } from "@/lib/game/config";
import { parseHandRequest } from "@/lib/game/payload";
import type { GamePlayerRow, GameRow } from "@/lib/game/types";

export const dynamic = "force-dynamic";
const err = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Record one hand (win or draw). The browser only says WHAT happened (winner, tiles, method); the server
 * recalculates faan and every score change with the shared engine, then saves everything in ONE database
 * transaction (record_hand_internal). Client-supplied totals are never accepted.
 * Who may record: the admin who opened the table, any admin, and players who joined with the room code.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return err(401, "Not signed in");

  let body: unknown;
  try { body = await req.json(); } catch { return err(400, "Invalid JSON"); }
  const parsed = parseHandRequest(body);
  if (!parsed.ok) return err(400, parsed.error);
  const r = parsed.value;

  // RLS already limits this to games the user can see; the permission to PLAY is then checked explicitly.
  const { data: game } = await supabase.from("games").select("*, game_players(*)").eq("id", params.id).maybeSingle();
  if (!game) return err(404, "Game not found");
  const g = game as GameRow & { game_players: GamePlayerRow[] };
  const { data: canPlay } = await supabase.rpc("can_play_game", { gid: g.id });
  if (!canPlay) return err(403, "Gabung dengan kode ruang dulu untuk mencatat tangan");
  if (g.status !== "in_progress") return err(409, g.status === "finished" ? "Game is already finished" : "Game is paused");

  const { count } = await supabase.from("game_hands").select("id", { count: "exact", head: true }).eq("game_id", g.id);
  const handsPlayed = count ?? 0;
  if (r.expectedHand !== handsPlayed + 1) return err(409, "The game moved on. Refresh and try again.");

  const players: SeatedPlayer[] = g.game_players.map((p) => ({ id: p.id, seat: p.seat_position, name: p.player_name, score: p.current_score }));
  const built = buildHandRecord(stateOfGame(g, handsPlayed), players, r.type === "draw" ? { type: "draw" } : { type: "win", hand: r.hand }, configForGame(g));
  if (!built.ok) return err(422, built.error);
  const rec = built.record;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("record_hand_internal", {
    p_owner: g.owner_id,   // permission was verified above with the signed-in user; the function re-checks the game exists and is open
    p_game: g.id, p_request: r.requestId, p_expected_hand: r.expectedHand,
    p_winner: rec.winnerId, p_discarder: rec.discarderId, p_method: rec.method, p_total_fan: rec.totalFan, p_points: rec.points,
    p_hand_tiles: rec.handTiles, p_hand_detail: rec.handDetail, p_fans: rec.fans,
    p_changes: rec.changes.map((c) => ({ player_id: c.playerId, change: c.change })), p_next: rec.next,
  });
  if (error) return err(/Another hand|not in progress|minimum|Not allowed/.test(error.message) ? 409 : 500, error.message);

  // Best effort: show winning hands on the cafe TV (no-op if this game is not seated at a cafe table).
  if (r.type === "win" && data && !data.duplicate) { try { await supabase.rpc("publish_winning_hand", { p_hand: data.hand_id }); } catch { /* TV is optional */ } }
  return NextResponse.json({ handId: data?.hand_id, duplicate: !!data?.duplicate, totalFan: rec.totalFan, gameOver: rec.gameOver });
}
