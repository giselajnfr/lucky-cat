import type { GameConfig, ScoreDistribution } from "./types";

/** Hong Kong Mahjong faan-to-base-points conversion table (0–13 faan). */
export const FAAN_TO_BASE_POINTS: readonly number[] = [
  1, 2, 4, 8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384,
];

/** Convert the winning hand's faan total to base points using the HK table. */
export const calculatePoints = (totalFan: number, _cfg?: Pick<GameConfig, "pointsPerFan">) => {
  const faan = Math.max(0, Math.min(13, Math.floor(totalFan)));
  return FAAN_TO_BASE_POINTS[faan];
};

/**
 * Settlement between four players. Payments always add up to the winner's points.
 * Self Draw: each opponent pays 2× base points.
 * Discard Win: either the discarder pays 3×, or discarder pays 2× and the other
 * two players pay 1× each. Dealer multipliers remain configurable on top.
 */
export function calculateScoreDistribution(p: {
  winnerId: string; discarderId?: string; dealerId: string; playerIds: string[];
  method: "SELF_DRAW" | "DISCARD"; basePoints: number; config: GameConfig;
}): ScoreDistribution {
  const { winnerId, discarderId, dealerId, playerIds, method, basePoints, config } = p;
  if (!playerIds.includes(winnerId)) throw new Error("Winner is not in this game");
  const losers = playerIds.filter((id) => id !== winnerId);
  const winnerIsDealer = winnerId === dealerId;
  const dealerMultiplier = winnerIsDealer ? config.discardRules.dealerMultiplier : 1;
  let payments: { playerId: string; points: number }[];

  if (method === "SELF_DRAW") {
    const m = winnerIsDealer ? config.selfDrawRules.dealerMultiplier : config.selfDrawRules.nonDealerMultiplier;
    payments = losers.map((id) => ({ playerId: id, points: Math.round(basePoints * 2 * m) }));
  } else {
    if (!discarderId || !losers.includes(discarderId)) throw new Error("Discard win needs a discarder who is not the winner");
    payments = losers.map((id) => ({
      playerId: id,
      points: id === discarderId
        ? Math.round(basePoints * (config.discardRules.paymentMode === "DISCARDER_PAYS_ALL" ? 3 : 2) * dealerMultiplier)
        : config.discardRules.paymentMode === "DISCARDER_FULL_OTHERS_HALF" ? Math.round(basePoints * dealerMultiplier) : 0,
    }));
  }
  return { winner: { playerId: winnerId, points: payments.reduce((s, x) => s + x.points, 0) }, payments };
}
