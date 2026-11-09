import type { Replay } from "../game-engine";

/** The exact JSON replace_game_hands_internal expects (kept in one place so the route and its test cannot drift apart). */
export function toReplacePayload(rep: Extract<Replay, { ok: true }>, playerIds: string[], editedHandId: string) {
  return {
    p_hands: rep.hands.map((h) => ({
      id: h.id, hand_number: h.handNumber, round_wind: h.roundWind, dealer_player_id: h.dealerPlayerId, winner_player_id: h.winnerId,
      winning_method: h.method, discard_player_id: h.discarderId, total_fan: h.totalFan, final_points: h.points, hand_tiles: h.handTiles,
      hand_detail: h.handDetail, state_before: h.stateBefore, edited: h.id === editedHandId, fans: h.fans,
      changes: h.scoreChanges.map((c) => ({ player_id: c.playerId, change: c.change, score_after: c.scoreAfter })),
    })),
    p_final: { ...rep.final, scores: playerIds.map((id) => ({ player_id: id, score: rep.scores[id] })) },
  };
}
