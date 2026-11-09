import { sortTiles } from "../scoring";
import type { GameConfig } from "../scoring";
import { advance, type GameState } from "./progression";
import { scoreHandForGame, type HandSubmission, type SeatedPlayer } from "./scoreHand";

export type Outcome = { type: "draw" } | { type: "win"; hand: HandSubmission };
export type NextState = { round_wind: string; dealer_seat: number; dealer_rotations: number };
export type HandRecord = {
  winnerId: string | null; discarderId: string | null; method: "self_draw" | "discard" | "draw";
  totalFan: number; points: number; handTiles: string[]; handDetail: Record<string, unknown>;
  fans: { id: string; name: string; fan: number; category: string | null }[];
  changes: { playerId: string; change: number }[];
  next: NextState; gameOver: boolean;
};

const nextOf = (s: GameState): NextState => ({ round_wind: s.roundWind, dealer_seat: s.dealerSeat, dealer_rotations: s.dealerRotations });

/**
 * Everything the database stores for ONE hand, derived on the server with the shared scoring engine.
 * Used both when recording a new hand and when replaying a game after a hand was edited, so the two can never disagree.
 */
export function buildHandRecord(state: GameState, players: SeatedPlayer[], outcome: Outcome, cfg: GameConfig): { ok: true; record: HandRecord } | { ok: false; error: string } {
  if (outcome.type === "draw") {
    const next = advance(state, { type: "draw" }, cfg);
    return { ok: true, record: { winnerId: null, discarderId: null, method: "draw", totalFan: 0, points: 0, handTiles: [], handDetail: { game_over: next.gameOver },
      fans: [], changes: [], next: nextOf(next.state), gameOver: next.gameOver } };
  }
  const h = outcome.hand;
  const scored = scoreHandForGame(state, players, h, cfg);
  if ("error" in scored) return { ok: false, error: scored.error };
  const winner = players.find((p) => p.id === h.winnerId)!;
  const next = advance(state, { type: "win", winnerSeat: winner.seat }, cfg);
  return { ok: true, record: {
    winnerId: h.winnerId, discarderId: h.discarderId ?? null, method: h.method === "SELF_DRAW" ? "self_draw" : "discard",
    totalFan: scored.result.totalFan, points: scored.result.basePoints,
    handTiles: [...sortTiles(h.concealedTiles), ...h.melds.flatMap((m) => m.tiles), ...h.flowers],
    handDetail: {
      concealed: h.concealedTiles, melds: h.melds, winningTile: h.winningTile, flowers: h.flowers,
      seatWind: scored.seatWind, roundWind: state.roundWind, isLastTile: !!h.isLastTile, isRobbingKong: !!h.isRobbingKong,
      reviewFlags: scored.result.reviewFlags, game_over: next.gameOver,
    },
    fans: scored.result.detectedFan.map((f) => ({ id: f.id, name: f.name, fan: f.fan, category: f.category ?? null })),
    changes: scored.changes, next: nextOf(next.state), gameOver: next.gameOver,
  } };
}
