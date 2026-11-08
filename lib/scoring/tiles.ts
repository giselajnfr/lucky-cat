import type { PlayTile, Tile, Wind } from "./types";

export const WINDS: Wind[] = ["E", "S", "W", "N"];
export const DRAGONS = ["RD", "GD", "WD"] as const;
export const SUITS = ["m", "s", "p"] as const;

/** Canonical ordering: characters, bamboo, dots, winds, dragons. */
export const ALL_PLAY_TILES = [
  ...SUITS.flatMap((s) => [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${n}${s}`)),
  ...WINDS, ...DRAGONS,
] as PlayTile[];
export const BONUS_TILES = ["F1", "F2", "F3", "F4", "S1", "S2", "S3", "S4"] as const;

export const isNumbered = (t: string) => /^[1-9][msp]$/.test(t);
export const isBonus = (t: string) => /^[FS][1-4]$/.test(t); // "S" alone is South wind
export const isWind = (t: string) => (WINDS as string[]).includes(t);
export const isDragon = (t: string) => (DRAGONS as readonly string[]).includes(t);
export const isHonor = (t: string) => isWind(t) || isDragon(t);
export const isValidTile = (t: string): t is Tile => isNumbered(t) || isHonor(t) || isBonus(t);
export const isPlayTile = (t: string): t is PlayTile => isNumbered(t) || isHonor(t);
export const rankOf = (t: string) => Number(t[0]);
export const suitOf = (t: string) => t[1];
export const isTerminal = (t: string) => isNumbered(t) && (rankOf(t) === 1 || rankOf(t) === 9);

export function countTiles(tiles: readonly string[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const t of tiles) c[t] = (c[t] ?? 0) + 1;
  return c;
}

export const sortTiles = <T extends string>(tiles: readonly T[]): T[] =>
  [...tiles].sort((a, b) => ALL_PLAY_TILES.indexOf(a as PlayTile) - ALL_PLAY_TILES.indexOf(b as PlayTile));

const SUIT_NAME: Record<string, string> = { m: "Characters", s: "Bamboo", p: "Dots" };
const NAMES: Record<string, string> = { E: "East", S: "South", W: "West", N: "North", RD: "Red Dragon", GD: "Green Dragon", WD: "White Dragon",
  F1: "Plum", F2: "Orchid", F3: "Chrysanthemum", F4: "Bamboo flower", S1: "Spring", S2: "Summer", S3: "Autumn", S4: "Winter" };
export const tileName = (t: string) => (isNumbered(t) ? `${t[0]} ${SUIT_NAME[t[1]]}` : NAMES[t] ?? t);
