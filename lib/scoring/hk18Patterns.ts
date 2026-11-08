/** One check per rule id. A check returns true/false, or a count (fan is multiplied by it). */
import { countTiles, isDragon, isHonor, isNumbered, isTerminal, isWind, rankOf, suitOf, WINDS } from "./tiles";
import type { ScoringContext } from "./types";

type Check = (c: ScoringContext) => boolean | number;
const std = (c: ScoringContext) => c.kind === "STANDARD";
const setsOf = (c: ScoringContext, pred: (t: string) => boolean) => std(c) ? c.sets.filter((s) => s.type !== "CHOW" && pred(s.tiles[0])) : [];
const suits = (c: ScoringContext) => new Set(c.allTiles.filter(isNumbered).map(suitOf));
/** Flower/season N belongs to the Nth seat: 1=East 2=South 3=West 4=North. */
const seatNo = (c: ScoringContext) => WINDS.indexOf(c.seatWind) + 1;
const dragonSets = (c: ScoringContext) => setsOf(c, isDragon).length;
const windSets = (c: ScoringContext) => setsOf(c, isWind).length;

function nineGates(c: ScoringContext): boolean {
  if (!std(c) || c.declaredMelds.length > 0 || c.allTiles.length !== 14) return false;
  if (suits(c).size !== 1 || c.allTiles.some(isHonor)) return false;
  const n = countTiles(c.allTiles.map((t) => String(rankOf(t))));
  const base: Record<string, number> = { "1": 3, "2": 1, "3": 1, "4": 1, "5": 1, "6": 1, "7": 1, "8": 1, "9": 3 };
  const extra = Object.keys(base).filter((r) => (n[r] ?? 0) === base[r] + 1);
  return extra.length === 1 && Object.keys(base).every((r) => (n[r] ?? 0) >= base[r]);
}

export const PATTERN_CHECKS: Record<string, Check> = {
  // Hand patterns
  "all-chows": (c) => std(c) && c.sets.every((s) => s.type === "CHOW") &&
    (!c.config.allChowsRequiresPlainPair || (!isDragon(c.pair[0]) && c.pair[0] !== c.seatWind && c.pair[0] !== c.roundWind)),
  "all-simples": (c) => c.allTiles.every((t) => isNumbered(t) && rankOf(t) >= 2 && rankOf(t) <= 8),
  "pure-straight": (c) => std(c) && ["m", "s", "p"].some((su) => [1, 4, 7].every((r) => c.sets.some((s) => s.type === "CHOW" && s.tiles[0] === `${r}${su}`))),
  "all-pongs": (c) => std(c) && c.sets.every((s) => s.type !== "CHOW"),
  "mixed-orphans": (c) => c.allTiles.every((t) => isTerminal(t) || isHonor(t)) && c.allTiles.some(isHonor) && c.allTiles.some(isTerminal),
  "pure-orphans": (c) => c.allTiles.every(isTerminal),
  "half-flush": (c) => suits(c).size === 1 && c.allTiles.some(isHonor),
  "full-flush": (c) => suits(c).size === 1 && !c.allTiles.some(isHonor),
  "little-dragon": (c) => dragonSets(c) === 2 && isDragon(c.pair[0]),
  "great-dragon": (c) => dragonSets(c) === 3,
  "little-wind": (c) => windSets(c) === 3 && isWind(c.pair[0]),
  "great-wind": (c) => windSets(c) === 4,
  "seven-pairs": (c) => c.kind === "SEVEN_PAIRS",
  "all-honors": (c) => c.allTiles.every(isHonor),
  "nine-gates": nineGates,
  "thirteen-orphans": (c) => c.kind === "THIRTEEN_ORPHANS",
  "four-kongs": (c) => std(c) && c.sets.filter((s) => s.type === "KONG").length === 4,
  // Additional faan
  "seat-wind": (c) => setsOf(c, (t) => t === c.seatWind).length > 0,
  "round-wind": (c) => setsOf(c, (t) => t === c.roundWind).length > 0,
  "dragon-pong": (c) => dragonSets(c),
  "suitable-flower": (c) => c.flowers.filter((f) => f === `F${seatNo(c)}` || f === `S${seatNo(c)}`).length,
  "no-flower": (c) => c.flowers.length === 0,
  "self-draw": (c) => c.method === "SELF_DRAW",
  "last-tile": (c) => c.isLastTile,
  "robbing-kong": (c) => c.isRobbingKong && c.method === "DISCARD",
  // Discard win only: on a self draw, Self Draw is awarded instead (never both).
  "concealed-hand": (c) => c.method === "DISCARD" && c.declaredMelds.every((m) => !m.exposed),
};
