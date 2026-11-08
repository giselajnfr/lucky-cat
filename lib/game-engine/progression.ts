import type { GameConfig, Wind } from "../scoring/types";

export type RoundWind = "east" | "south" | "west" | "north";
export const ROUND_WINDS: RoundWind[] = ["east", "south", "west", "north"];
export const ROUND_TO_WIND: Record<RoundWind, Wind> = { east: "E", south: "S", west: "W", north: "N" };
export const WIND_TO_ROUND: Record<Wind, RoundWind> = { E: "east", S: "south", W: "west", N: "north" };

/**
 * State mirrors the games table: seats are physical (0..3 = East, South, West, North at the start),
 * the DEALER rotates, and every player's seat wind is derived from the dealer.
 * dealerRotations = dealer changes inside the current round wind (0..3).
 */
export type GameState = { roundWind: RoundWind; dealerSeat: number; dealerRotations: number; handsPlayed: number };
export type HandOutcome = { type: "win"; winnerSeat: number } | { type: "draw" };
export type Progression = { state: GameState; dealerChanged: boolean; roundChanged: boolean; gameOver: boolean };

/** The dealer is always East; the other winds follow the seat order. */
export const seatWindOf = (seat: number, dealerSeat: number): Wind => (["E", "S", "W", "N"] as const)[(((seat - dealerSeat) % 4) + 4) % 4];

export const initialState = (roundWind: RoundWind = "east"): GameState => ({ roundWind, dealerSeat: 0, dealerRotations: 0, handsPlayed: 0 });

/**
 * Dealer stays after a dealer win (if configured) or a draw (HK18_RULES.drawKeepsDealer);
 * otherwise the deal passes to the next seat. After four dealer changes the round wind advances.
 * When the last configured round wind completes, gameOver is true (the UI then offers to finish).
 */
export function advance(s: GameState, outcome: HandOutcome, cfg: Pick<GameConfig, "progression">): Progression {
  const p = cfg.progression;
  const keep = outcome.type === "draw" ? p.drawKeepsDealer : outcome.winnerSeat === s.dealerSeat && p.dealerWinKeepsDealer;
  const next: GameState = { ...s, handsPlayed: s.handsPlayed + 1 };
  if (keep) return { state: next, dealerChanged: false, roundChanged: false, gameOver: false };

  next.dealerSeat = (s.dealerSeat + 1) % 4;
  next.dealerRotations = s.dealerRotations + 1;
  if (next.dealerRotations < 4) return { state: next, dealerChanged: true, roundChanged: false, gameOver: false };

  next.dealerRotations = 0;
  if (s.roundWind === p.lastRoundWind) return { state: next, dealerChanged: true, roundChanged: false, gameOver: true };
  next.roundWind = ROUND_WINDS[(ROUND_WINDS.indexOf(s.roundWind) + 1) % 4];
  return { state: next, dealerChanged: true, roundChanged: true, gameOver: false };
}
