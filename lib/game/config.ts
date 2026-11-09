import { DEFAULT_GAME_CONFIG } from "../scoring";
import type { GameConfig } from "../scoring";
import type { GameState } from "../game-engine";
import type { GameRow } from "./types";

/** The rules for ONE game: the shared HK18 configuration plus the per-game options the players chose when they started the session (minimum faan, faan cap, last round). */
export const configForGame = (g: Pick<GameRow, "min_fan" | "last_round_wind"> & { max_fan?: number | null; rule_preset?: GameRow["rule_preset"] }): GameConfig => ({
  ...DEFAULT_GAME_CONFIG, minimumFan: g.min_fan, maximumFan: g.max_fan ?? null,
  flatPointsPerWin: g.rule_preset === "chicken" ? 1 : null,   // Chicken Hand: no faan, every win is 1 point
  progression: { ...DEFAULT_GAME_CONFIG.progression, lastRoundWind: g.last_round_wind },
});

export const stateOfGame = (g: Pick<GameRow, "current_round_wind" | "current_dealer_seat" | "dealer_rotations">, handsPlayed: number): GameState => ({
  roundWind: g.current_round_wind, dealerSeat: g.current_dealer_seat, dealerRotations: g.dealer_rotations, handsPlayed,
});
