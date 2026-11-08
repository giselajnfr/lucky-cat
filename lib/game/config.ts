import { DEFAULT_GAME_CONFIG } from "../scoring";
import type { GameConfig } from "../scoring";
import type { GameState } from "../game-engine";
import type { GameRow } from "./types";

/** The rules for ONE game: the shared HK18 configuration plus the per-game options chosen at creation. */
export const configForGame = (g: Pick<GameRow, "min_fan" | "last_round_wind">): GameConfig => ({
  ...DEFAULT_GAME_CONFIG, minimumFan: g.min_fan,
  progression: { ...DEFAULT_GAME_CONFIG.progression, lastRoundWind: g.last_round_wind },
});

export const stateOfGame = (g: Pick<GameRow, "current_round_wind" | "current_dealer_seat" | "dealer_rotations">, handsPlayed: number): GameState => ({
  roundWind: g.current_round_wind, dealerSeat: g.current_dealer_seat, dealerRotations: g.dealer_rotations, handsPlayed,
});
