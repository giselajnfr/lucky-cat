import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { advance, scoreHandForGame, type SeatedPlayer } from "@/lib/game-engine";
import { configForGame, stateOfGame } from "@/lib/game/config";
import { parseHandRequest } from "@/lib/game/payload";
import { sortTiles } from "@/lib/scoring";
import type { GamePlayerRow, GameRow } from "@/lib/game/types";

export const dynamic = "force-dynamic";
const err = (status: number, error: string) => NextResponse.json({ error }, { status });

/**
 * Record one hand (win or draw). The browser only says WHAT happened (winner, tiles, method); the server
 * recalculates faan and every score change with the shared engine, then saves everything in ONE database
 * transaction (record_hand_internal). Client-supplied totals are never accepted.
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

  // RLS already limits this to games the user can see; ownership is then checked explicitly.
  const { data: game } = await supabase.from("games").select("*, game_players(*)").eq("id", params.id).maybeSingle();
  if (!game) return err(404, "Game not found");
  const g = game as GameRow & { game_players: GamePlayerRow[] };
  if (g.owner_id !== user.id) return err(403, "Only the game creator can record hands");
  if (g.status !== "in_progress") return err(409, g.status === "finished" ? "Game is already finished" : "Game is paused");

  const { count } = await supabase.from("game_hands").select("id", { count: "exact", head: true }).eq("game_id", g.id);
  const handsPlayed = count ?? 0;
  if (r.expectedHand !== handsPlayed + 1) return err(409, "The game moved on. Refresh and try again.");

  const players: SeatedPlayer[] = g.game_players.map((p) => ({ id: p.id, seat: p.seat_position, name: p.player_name, score: p.current_score }));
  const cfg = configForGame(g);
  const state = stateOfGame(g, handsPlayed);

  let rpcArgs: Record<string, unknown>;
  let summary: { totalFan: number; gameOver: boolean };
  if (r.type === "draw") {
    const next = advance(state, { type: "draw" }, cfg);
    rpcArgs = { p_winner: null, p_discarder: null, p_method: "draw", p_total_fan: 0, p_points: 0, p_hand_tiles: [],
      p_hand_detail: { game_over: next.gameOver }, p_fans: [], p_changes: [],
      p_next: { round_wind: next.state.roundWind, dealer_seat: next.state.dealerSeat, dealer_rotations: next.state.dealerRotations } };
    summary = { totalFan: 0, gameOver: next.gameOver };
  } else {
    const scored = scoreHandForGame(state, players, r.hand, cfg);
    if ("error" in scored) return err(422, scored.error);
    const winner = players.find((p) => p.id === r.hand.winnerId)!;
    const next = advance(state, { type: "win", winnerSeat: winner.seat }, cfg);
    const tilesFlat = [...sortTiles(r.hand.concealedTiles), ...r.hand.melds.flatMap((m) => m.tiles), ...r.hand.flowers];
    rpcArgs = {
      p_winner: r.hand.winnerId, p_discarder: r.hand.discarderId ?? null, p_method: r.hand.method === "SELF_DRAW" ? "self_draw" : "discard",
      p_total_fan: scored.result.totalFan, p_points: scored.result.basePoints, p_hand_tiles: tilesFlat,
      p_hand_detail: {
        concealed: r.hand.concealedTiles, melds: r.hand.melds, winningTile: r.hand.winningTile, flowers: r.hand.flowers,
        seatWind: scored.seatWind, roundWind: state.roundWind, isLastTile: !!r.hand.isLastTile, isRobbingKong: !!r.hand.isRobbingKong,
        reviewFlags: scored.result.reviewFlags, game_over: next.gameOver,
      },
      p_fans: scored.result.detectedFan.map((f) => ({ id: f.id, name: f.name, fan: f.fan, category: f.category })),
      p_changes: scored.changes.map((c) => ({ player_id: c.playerId, change: c.change })),
      p_next: { round_wind: next.state.roundWind, dealer_seat: next.state.dealerSeat, dealer_rotations: next.state.dealerRotations },
    };
    summary = { totalFan: scored.result.totalFan, gameOver: next.gameOver };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("record_hand_internal", {
    p_owner: user.id, p_game: g.id, p_request: r.requestId, p_expected_hand: r.expectedHand, ...rpcArgs,
  });
  if (error) return err(/Another hand|not in progress|minimum|Not allowed/.test(error.message) ? 409 : 500, error.message);

  // Best effort: show winning hands on the cafe TV (no-op if this game is not seated at a cafe table).
  if (r.type === "win" && data && !data.duplicate) { try { await supabase.rpc("publish_winning_hand", { p_hand: data.hand_id }); } catch { /* TV is optional */ } }
  return NextResponse.json({ handId: data?.hand_id, duplicate: !!data?.duplicate, ...summary });
}
