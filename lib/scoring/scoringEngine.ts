import { calculateFan } from "./fanDetector";
import { buildContext } from "./handParser";
import { validateHand } from "./handValidator";
import { waitTypes } from "./waits";
import { calculatePoints, calculateScoreDistribution } from "./pointCalculator";
import type { ScoringResult, WinningHandInput } from "./types";

export type ScoreOptions = {
  players?: { winnerId: string; discarderId?: string; dealerId: string; playerIds: string[] };
};

const invalid = (minimumFan: number, errors: string[]): ScoringResult => ({
  valid: false, errors, meetsMinimum: false, minimumFan, canRecord: false, detectedFan: [], excludedFan: [],
  rawFan: 0, totalFan: 0, basePoints: 0, reviewFlags: [], explanation: errors,
});

/**
 * Single, deterministic entry point (no I/O, no UI): validate -> decompose -> detect -> exclusions -> total.
 * Runs identically in the browser (live preview) and on the server (authoritative recalculation).
 */
export function calculateScore(input: WinningHandInput, opts: ScoreOptions = {}): ScoringResult {
  const cfg = input.gameConfig;
  const { errors, decompositions } = validateHand(input);
  if (errors.length) return invalid(cfg.minimumFan, errors);

  // Chicken Hand table: no faan, no minimum. Any valid winning hand is worth a flat number of points.
  if (cfg.flatPointsPerWin != null) {
    const basePoints = cfg.flatPointsPerWin;
    const result: ScoringResult = {
      valid: true, errors: [], meetsMinimum: true, minimumFan: 0, canRecord: true, handDecomposition: decompositions[0],
      detectedFan: [], excludedFan: [], rawFan: 0, totalFan: 0, basePoints, reviewFlags: [],
      explanation: [`Chicken Hand: ${basePoints} poin per kemenangan, tanpa faan, tidak ada yang membayar`],
    };
    // Chicken Hand pays from the bank: the winner gets the points, nobody else loses any (not zero-sum, on purpose).
    if (opts.players) result.scoreDistribution = { winner: { playerId: opts.players.winnerId, points: basePoints }, payments: [] };
    return result;
  }

  // Score every possible reading of the hand; the best total wins (ties keep the first found).
  const scored = decompositions.map((d) => ({ d, f: calculateFan(buildContext(input, d)) }));
  const best = scored.reduce((a, b) => (b.f.totalFan > a.f.totalFan ? b : a));
  const isChicken = best.f.detected.some((f) => f.id === "chicken-hand");
  const meetsMinimum = best.f.fanForMinimum >= cfg.minimumFan && !(isChicken && !cfg.chickenHandCanWinOnBonusFaan);
  const basePoints = calculatePoints(best.f.totalFan, cfg);

  const explanation = [
    ...best.f.detected.map((f) => `${f.name}: ${f.fan} faan`),
    `Total ${best.f.totalFan} faan (minimum ${cfg.minimumFan}, tanpa poin bunga: ${best.f.fanForMinimum})`,
  ];
  const result: ScoringResult = {
    valid: true, errors: [], meetsMinimum, minimumFan: cfg.minimumFan, canRecord: meetsMinimum,
    reason: meetsMinimum ? undefined : "Winning hand does not meet the minimum faan requirement (flower and no-flower points do not count toward the minimum)",
    handDecomposition: best.d, detectedFan: best.f.detected, excludedFan: best.f.excludedFan,
    rawFan: best.f.rawFan, totalFan: best.f.totalFan, basePoints, reviewFlags: best.f.reviewFlags, explanation,
    maximumFan: cfg.maximumFan, rulesetId: cfg.rulesetId, rulesetName: cfg.rulesetName, waits: waitTypes(input, best.d),
  };
  if (opts.players && meetsMinimum)
    result.scoreDistribution = calculateScoreDistribution({ ...opts.players, method: input.winningMethod, basePoints, config: cfg });
  return result;
}
