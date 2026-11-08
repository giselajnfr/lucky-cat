import { calculateScore } from "../scoring/scoringEngine";
import type { BonusTile, GameConfig, Meld, PlayTile, ScoringResult, WinMethod } from "../scoring/types";
import { ROUND_TO_WIND, seatWindOf, type GameState } from "./progression";

export type SeatedPlayer = { id: string; seat: number; name: string; score: number };

export type HandSubmission = {
  winnerId: string; discarderId?: string; method: WinMethod;
  concealedTiles: PlayTile[]; melds: Meld[]; winningTile: PlayTile; flowers: BonusTile[];
  isLastTile?: boolean; isRobbingKong?: boolean;
};

export type ScoredHand = {
  result: ScoringResult;
  changes: { playerId: string; change: number }[];   // zero-sum point changes
  seatWind: ReturnType<typeof seatWindOf>;
};

/** Authoritative per-game scoring. The server calls this and never trusts client totals. */
export function scoreHandForGame(state: GameState, players: SeatedPlayer[], h: HandSubmission, cfg: GameConfig): ScoredHand | { error: string } {
  const winner = players.find((p) => p.id === h.winnerId);
  if (!winner) return { error: "Winner is not in this game" };
  if (players.length !== 4) return { error: "A game needs exactly four players" };
  if (h.method === "DISCARD") {
    if (!h.discarderId || h.discarderId === h.winnerId || !players.some((p) => p.id === h.discarderId)) return { error: "A discard win needs a discarding player other than the winner" };
  } else if (h.discarderId) return { error: "A self-draw win has no discarding player" };

  const dealer = players.find((p) => p.seat === state.dealerSeat);
  if (!dealer) return { error: "Dealer seat has no player" };
  const seatWind = seatWindOf(winner.seat, state.dealerSeat);
  const result = calculateScore({
    concealedTiles: h.concealedTiles, melds: h.melds, winningTile: h.winningTile, flowers: h.flowers, winningMethod: h.method,
    winnerSeatWind: seatWind, roundWind: ROUND_TO_WIND[state.roundWind], isDealer: winner.id === dealer.id,
    isLastTile: h.isLastTile, isRobbingKong: h.isRobbingKong, gameConfig: cfg,
  }, { players: { winnerId: winner.id, discarderId: h.discarderId, dealerId: dealer.id, playerIds: players.map((p) => p.id) } });
  if (!result.canRecord || !result.scoreDistribution) return { error: result.errors[0] ?? result.reason ?? "Hand cannot be recorded" };

  const d = result.scoreDistribution;
  const changes = [{ playerId: d.winner.playerId, change: d.winner.points }, ...d.payments.map((x) => ({ playerId: x.playerId, change: -x.points }))];
  return { result, changes, seatWind };
}

/** Final ranking: highest score first; ties share the same rank. */
export function rankPlayers<T extends { score: number }>(ps: T[]): (T & { rank: number })[] {
  const sorted = [...ps].sort((a, b) => b.score - a.score);
  return sorted.map((p) => ({ ...p, rank: 1 + sorted.filter((q) => q.score > p.score).length }));
}
