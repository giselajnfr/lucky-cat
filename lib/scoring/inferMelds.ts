import { countTiles } from "./tiles";
import type { Meld, PlayTile } from "./types";

/**
 * Players tap their tiles as ONE flat list; nobody declares chis, pongs or gongs.
 *  - chis and pongs: the scoring engine already finds them in the concealed tiles (it tries every split),
 *  - gongs: every gong adds one tile, so 14 tiles = no gong, 15 = one, 16 = two ... up to 18.
 * `meldCandidates` returns every way to pick which four-of-a-kind groups are the gongs (usually exactly one),
 * each as { concealed, melds } ready for the engine. The caller scores them and keeps the best.
 */
export type Candidate = { concealed: PlayTile[]; melds: Meld[] };

/** Tile kinds of which all four copies are in the hand. */
export const quadsIn = (tiles: PlayTile[]): PlayTile[] =>
  Object.entries(countTiles(tiles)).filter(([, n]) => n === 4).map(([t]) => t as PlayTile);

/** Most tiles that make sense for this hand right now: 14 plus one per four-of-a-kind (each could be a gong). */
export const maxTilesFor = (tiles: PlayTile[]): number => 14 + quadsIn(tiles).length;

const choose = <T,>(items: T[], k: number): T[][] =>
  k === 0 ? [[]] : items.flatMap((x, i) => choose(items.slice(i + 1), k - 1).map((rest) => [x, ...rest]));

export function meldCandidates(tiles: PlayTile[]): Candidate[] {
  const gongs = tiles.length - 14;
  if (gongs < 0 || gongs > 4) return [];
  return choose(quadsIn(tiles), gongs).map((picked) => ({
    concealed: tiles.filter((t) => !picked.includes(t)),
    melds: picked.map((t): Meld => ({ type: "KONG", tiles: [t, t, t, t], exposed: false })),
  }));
}

/** A saved hand (concealed tiles + declared melds) back into the flat list the player types. */
export const flattenHand = (concealed: PlayTile[], melds: Meld[]): PlayTile[] => [...concealed, ...melds.flatMap((m) => m.tiles)];
