import type { Meld, PlayTile } from "./types";
import { ALL_PLAY_TILES, countTiles, isNumbered, rankOf, suitOf } from "./tiles";

export type Split = { sets: Meld[]; pair: PlayTile[] };

/**
 * Backtracking search for every way to split `concealed` into `setCount` sets + 1 pair.
 * Only the concealed tiles are split: declared melds (incl. Kongs) are already fixed sets.
 * Rule of thumb: always resolve the LOWEST remaining tile — it can only be the start of a
 * Pung or the bottom of a Chow — so each split is generated exactly once.
 */
export function findDecompositions(concealed: PlayTile[], setCount: number): Split[] {
  const counts = countTiles(concealed);
  const out: Split[] = [];

  const solve = (): Meld[][] => {
    const first = ALL_PLAY_TILES.find((t) => (counts[t] ?? 0) > 0);
    if (!first) return [[]];
    const results: Meld[][] = [];
    if (counts[first] >= 3) {
      counts[first] -= 3;
      for (const rest of solve()) results.push([{ type: "PUNG", tiles: [first, first, first], exposed: false }, ...rest]);
      counts[first] += 3;
    }
    if (isNumbered(first) && rankOf(first) <= 7) {
      const s = suitOf(first);
      const b = `${rankOf(first) + 1}${s}` as PlayTile, c = `${rankOf(first) + 2}${s}` as PlayTile;
      if ((counts[b] ?? 0) > 0 && (counts[c] ?? 0) > 0) {
        counts[first]--; counts[b]--; counts[c]--;
        for (const rest of solve()) results.push([{ type: "CHOW", tiles: [first, b, c], exposed: false }, ...rest]);
        counts[first]++; counts[b]++; counts[c]++;
      }
    }
    return results;
  };

  for (const p of ALL_PLAY_TILES) {
    if ((counts[p] ?? 0) < 2) continue;
    counts[p] -= 2;
    for (const sets of solve()) if (sets.length === setCount) out.push({ sets, pair: [p, p] });
    counts[p] += 2;
  }
  return out;
}
