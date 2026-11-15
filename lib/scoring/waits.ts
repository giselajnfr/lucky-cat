import { findDecompositions } from "./combinations";
import { ALL_PLAY_TILES, rankOf } from "./tiles";
import type { HandDecomposition, PlayTile, WaitType, WinningHandInput } from "./types";

/**
 * Which kinds of wait could the winning tile have filled in THIS reading of the hand?
 * Only the concealed part of the hand can hold the winning tile (declared melds are fixed sets).
 * A chow wait is read from the winning tile's place in the chow:
 *   middle (4 in 345) -> closed (kanchan) · 3 in 123 or 7 in 789 -> edge (penchan) · otherwise -> two-sided (ryanmen).
 * Seven Pairs: the last pair is a single wait. Thirteen Orphans: no wait type is assigned.
 * A tile that fits several places gives several waits; rules that pay a wait use the one that favours the winner.
 */
export function waitTypes(input: WinningHandInput, d: HandDecomposition): WaitType[] {
  const w = input.winningTile;
  const out = new Set<WaitType>();
  if (d.kind === "SEVEN_PAIRS") return ["single"];
  if (d.kind !== "STANDARD") return [];
  if (d.pair[0] === w) out.add("single");
  for (const s of d.sets.slice(input.melds.length)) {
    if (!s.tiles.includes(w)) continue;
    if (s.type !== "CHOW") { out.add("dualPung"); continue; }
    const start = rankOf(s.tiles[0]), r = rankOf(w);
    if (r === start + 1) out.add("closed");
    else if ((start === 1 && r === 3) || (start === 7 && r === 7)) out.add("edge");
    else out.add("twoSided");
  }
  return [...out];
}

/** How many different tiles would have completed the 13 tiles held before the winning tile (standard hands only; null if not applicable). */
export function completingTileCount(input: WinningHandInput): number | null {
  const base = [...input.concealedTiles];
  const at = base.indexOf(input.winningTile);
  if (at < 0) return null;
  base.splice(at, 1);
  const setCount = 4 - input.melds.length;
  const held = new Map<string, number>();
  for (const t of [...base, ...input.melds.flatMap((m) => m.tiles)]) held.set(t, (held.get(t) ?? 0) + 1);
  let n = 0;
  for (const t of ALL_PLAY_TILES as PlayTile[]) {
    if ((held.get(t) ?? 0) >= 4) continue;
    if (findDecompositions([...base, t], setCount).length > 0) n++;
  }
  return n;
}
