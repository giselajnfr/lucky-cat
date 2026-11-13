import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { replayGame, type Outcome, type SeatedPlayer, type StoredHand } from "@/lib/game-engine";
import { configForGame } from "@/lib/game/config";
import { parseHandRequest } from "@/lib/game/payload";
import { toReplacePayload } from "@/lib/game/replacePayload";
import type { GamePlayerRow, GameRow, HandDetail } from "@/lib/game/types";
import type { BonusTile, Meld, PlayTile } from "@/lib/scoring";

export const dynamic = "force-dynamic";
const err = (status: number, error: string) => NextResponse.json({ error }, { status });

type StoredRow = { id: string; hand_number: number; winner_player_id: string | null; discard_player_id: string | null;
  winning_method: "self_draw" | "discard" | "draw"; hand_detail: HandDetail | null; state_before: { round_wind: string; dealer_seat: number; dealer_rotations: number } | null };

/** A hand that was already saved, turned back into scoring input. */
function storedOutcome(h: StoredRow): Outcome | { error: string } {
  if (h.winning_method === "draw") return { type: "draw" };
  const d = h.hand_detail;
  if (!d || !h.winner_player_id) return { error: `Tangan #${h.hand_number} tidak menyimpan detail kartu, jadi game ini tidak bisa dihitung ulang` };
  return { type: "win", hand: {
    winnerId: h.winner_player_id, discarderId: h.discard_player_id ?? undefined, method: h.winning_method === "self_draw" ? "SELF_DRAW" : "DISCARD",
    concealedTiles: d.concealed as PlayTile[], melds: d.melds as Meld[], winningTile: d.winningTile as PlayTile, flowers: d.flowers as BonusTile[],
    isLastTile: d.isLastTile, isRobbingKong: d.isRobbingKong, openMelds: d.openMelds ?? d.melds.some((m) => m.exposed),
  } };
}

/**
 * Edit one saved hand. Changing a hand can change who deals next, so the server REPLAYS the whole game from hand 1 with the
 * shared scoring engine (every later hand is re-scored with its own saved tiles) and then replaces all hands, faan, score
 * history and the final scores in ONE database transaction. Totals are never taken from the browser.
 * Body: same shape as recording a hand; `expectedHand` is the number of hands the browser currently shows (detects stale screens).
 */
export async function PATCH(req: Request, { params }: { params: { id: string; handId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return err(401, "Not signed in");

  let body: unknown;
  try { body = await req.json(); } catch { return err(400, "Invalid JSON"); }
  const parsed = parseHandRequest(body);
  if (!parsed.ok) return err(400, parsed.error);
  const r = parsed.value;

  const { data: game } = await supabase.from("games").select("*, game_players(*)").eq("id", params.id).maybeSingle();
  if (!game) return err(404, "Game not found");
  const g = game as GameRow & { game_players: GamePlayerRow[] };
  const { data: canPlay } = await supabase.rpc("can_play_game", { gid: g.id });
  if (!canPlay) return err(403, "Gabung dengan kode ruang dulu untuk mengubah tangan");

  const { data: rows } = await supabase.from("game_hands")
    .select("id, hand_number, winner_player_id, discard_player_id, winning_method, hand_detail, state_before").eq("game_id", g.id).order("hand_number");
  const hands = (rows ?? []) as StoredRow[];
  if (r.expectedHand !== hands.length) return err(409, "Game berubah. Muat ulang lalu coba lagi.");
  if (!hands.some((h) => h.id === params.handId)) return err(404, "Hand not found");
  const first = hands[0]?.state_before;
  if (!first) return err(422, "Game ini tidak menyimpan keadaan awal, jadi tidak bisa dihitung ulang");

  const players: SeatedPlayer[] = g.game_players.map((p) => ({ id: p.id, seat: p.seat_position, name: p.player_name, score: g.starting_points }));
  const stored: StoredHand[] = [];
  for (const h of hands) {
    const o: Outcome | { error: string } = h.id === params.handId ? (r.type === "draw" ? { type: "draw" } : { type: "win", hand: r.hand }) : storedOutcome(h);
    if ("error" in o) return err(422, o.error);
    stored.push({ id: h.id, outcome: o });
  }

  const rep = replayGame({ roundWind: first.round_wind as GameRow["current_round_wind"], dealerSeat: first.dealer_seat, dealerRotations: first.dealer_rotations, handsPlayed: 0 }, players, stored, configForGame(g));
  if (!rep.ok) return err(422, `Tangan #${rep.handNumber}: ${rep.error}`);

  const admin = createAdminClient();
  const { error } = await admin.rpc("replace_game_hands_internal", {
    p_user: user.id, p_game: g.id, p_expected: hands.length, ...toReplacePayload(rep, players.map((p) => p.id), params.handId),
  });
  if (error) return err(/Another hand|Not allowed|finished|minimum/.test(error.message) ? 409 : 500, error.message);
  return NextResponse.json({ ok: true, hands: hands.length });
}
