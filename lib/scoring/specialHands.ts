import type { HandDecomposition, PlayTile, WinningHandInput } from "./types";
import { ALL_PLAY_TILES, countTiles, isHonor, isTerminal } from "./tiles";

/** Special hands live apart from the standard 4-sets+pair validator. Enabled via GameConfig.specialHands. */
export function detectSpecialHands(input: WinningHandInput): HandDecomposition[] {
  const { concealedTiles: t, melds, gameConfig: cfg } = input;
  if (melds.length > 0 || t.length !== 14) return [];
  const counts = countTiles(t);
  const found: HandDecomposition[] = [];
  if (cfg.specialHands.sevenPairs && Object.values(counts).length === 7 && Object.values(counts).every((n) => n === 2))
    found.push({ kind: "SEVEN_PAIRS", sets: [], pair: [] });
  const orphans = ALL_PLAY_TILES.filter((x) => isHonor(x) || isTerminal(x)) as PlayTile[];
  if (cfg.specialHands.thirteenOrphans && t.every((x) => orphans.includes(x)) && orphans.every((x) => (counts[x] ?? 0) >= 1))
    found.push({ kind: "THIRTEEN_ORPHANS", sets: [], pair: [] });
  return found;
}
