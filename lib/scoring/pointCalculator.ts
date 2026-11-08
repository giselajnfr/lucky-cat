import type { GameConfig, ScoreDistribution } from "./types";

/** HK18: points equal faan (times pointsPerFan, default 1). No money, no 1.5 multiplier. */
export const calculatePoints = (totalFan: number, cfg: Pick<GameConfig, "pointsPerFan">) => (totalFan > 0 ? totalFan * cfg.pointsPerFan : 0);

/**
 * Settlement between players. Zero-sum: the winner receives exactly what the others pay.
 * The HK18 table does not define dealer bonuses or split payments, so the defaults are neutral
 * (multipliers 1, discarder pays all) and live in GameConfig.
 */
export function calculateScoreDistribution(p: {
  winnerId: string; discarderId?: string; dealerId: string; playerIds: string[];
  method: "SELF_DRAW" | "DISCARD"; basePoints: number; config: GameConfig;
}): ScoreDistribution {
  const { winnerId, discarderId, dealerId, playerIds, method, basePoints, config } = p;
  if (!playerIds.includes(winnerId)) throw new Error("Winner is not in this game");
  const losers = playerIds.filter((id) => id !== winnerId);
  const winnerIsDealer = winnerId === dealerId;
  let payments: { playerId: string; points: number }[];

  if (method === "SELF_DRAW") {
    const m = winnerIsDealer ? config.selfDrawRules.dealerMultiplier : config.selfDrawRules.nonDealerMultiplier;
    payments = losers.map((id) => ({ playerId: id, points: Math.round(basePoints * m) }));
  } else {
    if (!discarderId || !losers.includes(discarderId)) throw new Error("Discard win needs a discarder who is not the winner");
    const amount = Math.round(basePoints * (winnerIsDealer ? config.discardRules.dealerMultiplier : 1));
    const others = config.discardRules.paymentMode === "DISCARDER_FULL_OTHERS_HALF" ? Math.round(amount / 2) : 0;
    payments = losers.map((id) => ({ playerId: id, points: id === discarderId ? amount : others }));
  }
  return { winner: { playerId: winnerId, points: payments.reduce((s, x) => s + x.points, 0) }, payments };
}
