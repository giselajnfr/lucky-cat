import type { GameConfig } from "../scoring";
import { seatWindOf, type GameState } from "./progression";
import { buildHandRecord, type HandRecord, type NextState, type Outcome } from "./record";
import type { SeatedPlayer } from "./scoreHand";

export type StoredHand = { id: string; outcome: Outcome };
export type ReplayedHand = HandRecord & {
  id: string; handNumber: number; roundWind: string; dealerPlayerId: string; stateBefore: NextState;
  scoreChanges: { playerId: string; change: number; scoreAfter: number }[];
};
export type Replay =
  | { ok: true; hands: ReplayedHand[]; scores: Record<string, number>; final: NextState }
  | { ok: false; handNumber: number; error: string };

/**
 * Plays the whole game again from hand 1, in order. Editing a hand can change who deals next, which changes
 * seat winds, payments and score history of every later hand, so after an edit EVERYTHING after it is recomputed.
 * `start` is the game state before hand 1; `players[].score` must be the starting points.
 */
export function replayGame(start: GameState, players: SeatedPlayer[], hands: StoredHand[], cfg: GameConfig): Replay {
  let state: GameState = { ...start, handsPlayed: 0 };
  const scores: Record<string, number> = Object.fromEntries(players.map((p) => [p.id, p.score]));
  const out: ReplayedHand[] = [];

  for (let i = 0; i < hands.length; i++) {
    const dealer = players.find((p) => p.seat === state.dealerSeat);
    if (!dealer) return { ok: false, handNumber: i + 1, error: "Dealer seat has no player" };
    const seated = players.map((p) => ({ ...p, score: scores[p.id] }));
    const r = buildHandRecord(state, seated, hands[i].outcome, cfg);
    if (!r.ok) return { ok: false, handNumber: i + 1, error: r.error };

    const scoreChanges = r.record.changes.map((c) => { scores[c.playerId] += c.change; return { playerId: c.playerId, change: c.change, scoreAfter: scores[c.playerId] }; });
    out.push({ ...r.record, id: hands[i].id, handNumber: i + 1, roundWind: state.roundWind, dealerPlayerId: dealer.id,
      stateBefore: { round_wind: state.roundWind, dealer_seat: state.dealerSeat, dealer_rotations: state.dealerRotations }, scoreChanges });
    state = { roundWind: r.record.next.round_wind as GameState["roundWind"], dealerSeat: r.record.next.dealer_seat, dealerRotations: r.record.next.dealer_rotations, handsPlayed: i + 1 };
  }
  return { ok: true, hands: out, scores, final: { round_wind: state.roundWind, dealer_seat: state.dealerSeat, dealer_rotations: state.dealerRotations } };
}

export { seatWindOf };
