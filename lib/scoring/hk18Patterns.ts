/** One check per rule id. A check returns true/false, or a count (fan is multiplied by it). */
import { countTiles, isDragon, isHonor, isNumbered, isTerminal, isWind, rankOf, suitOf, WINDS } from "./tiles";
import type { BonusTile, PlayTile, ScoringContext } from "./types";

type Check = (c: ScoringContext) => boolean | number;
const std = (c: ScoringContext) => c.kind === "STANDARD";
const setsOf = (c: ScoringContext, pred: (t: string) => boolean) => std(c) ? c.sets.filter((s) => s.type !== "CHOW" && pred(s.tiles[0])) : [];
const suits = (c: ScoringContext) => new Set(c.allTiles.filter(isNumbered).map(suitOf));
/** Flower/season N belongs to the Nth seat: 1=East 2=South 3=West 4=North. */
const seatNo = (c: ScoringContext) => WINDS.indexOf(c.seatWind) + 1;
const dragonSets = (c: ScoringContext) => setsOf(c, isDragon).length;
const windSets = (c: ScoringContext) => setsOf(c, isWind).length;

function nineGates(c: ScoringContext): boolean {
  if (!std(c) || c.declaredMelds.length > 0 || c.openHand || c.allTiles.length !== 14) return false;
  if (suits(c).size !== 1 || c.allTiles.some(isHonor)) return false;
  const n = countTiles(c.allTiles.map((t) => String(rankOf(t))));
  const base: Record<string, number> = { "1": 3, "2": 1, "3": 1, "4": 1, "5": 1, "6": 1, "7": 1, "8": 1, "9": 3 };
  const extra = Object.keys(base).filter((r) => (n[r] ?? 0) === base[r] + 1);
  return extra.length === 1 && Object.keys(base).every((r) => (n[r] ?? 0) >= base[r]);
}

/** Every set plus the pair, as tile lists. */
const groups = (c: ScoringContext) => [...c.sets.map((s) => s.tiles), c.pair];
const chowsOf = (c: ScoringContext) => (std(c) ? c.sets.filter((s) => s.type === "CHOW") : []);
const pungsOf = (c: ScoringContext) => (std(c) ? c.sets.filter((s) => s.type !== "CHOW") : []);
const pungHas = (c: ScoringContext, t: string) => pungsOf(c).some((s) => s.tiles[0] === t);
const chowHas = (c: ScoringContext, t: string) => chowsOf(c).some((s) => s.tiles[0] === t);
const SU = ["m", "s", "p"];
/** Pungs/kongs that are concealed. A pung finished by the winning tile off a discard is exposed. If the player only flagged
 *  "there is an open set" (we do not know which), one set is assumed open, and it is a chow when the hand has one. */
export function concealedPungCount(c: ScoringContext): number {
  if (!std(c)) return 0;
  let n = 0;
  c.sets.forEach((s, i) => {
    if (s.type === "CHOW") return;
    const declared = i < c.declaredMelds.length;
    if (declared) { if (!s.exposed) n++; return; }
    if (c.method === "DISCARD" && s.tiles[0] === c.winningTile) return;
    n++;
  });
  const flaggedOnly = c.openHand && c.declaredMelds.every((m) => !m.exposed);
  if (flaggedOnly) n -= c.sets.some((s) => s.type === "CHOW") ? 0 : 1;
  return Math.max(0, n);
}
const consecutivePungs = (c: ScoringContext, len: number) => SU.some((su) => [1, 2, 3, 4, 5, 6, 7, 8, 9].some((r) => r + len - 1 <= 9 && Array.from({ length: len }, (_, k) => pungHas(c, `${r + k}${su}`)).every(Boolean)));

export const PATTERN_CHECKS: Record<string, Check> = {
  // Hand patterns
  "all-chows": (c) => std(c) && c.sets.every((s) => s.type === "CHOW") &&
    (!c.config.allChowsRequiresPlainPair || (!isDragon(c.pair[0]) && c.pair[0] !== c.seatWind && c.pair[0] !== c.roundWind)),
  "all-simples": (c) => c.allTiles.every((t) => isNumbered(t) && rankOf(t) >= 2 && rankOf(t) <= 8),
  "pure-straight": (c) => std(c) && ["m", "s", "p"].some((su) => [1, 4, 7].every((r) => c.sets.some((s) => s.type === "CHOW" && s.tiles[0] === `${r}${su}`))),
  "all-pongs": (c) => std(c) && c.sets.every((s) => s.type !== "CHOW"),
  // Mixed / Pure Orphans: EVERY set and the pair contains a terminal (1/9) or honor. A 123 or 789 chow counts.
  "mixed-orphans": (c) => std(c) ? groups(c).every((g) => g.some((t) => isTerminal(t) || isHonor(t))) && c.allTiles.some(isHonor)
    : c.allTiles.every((t) => isTerminal(t) || isHonor(t)) && c.allTiles.some(isHonor) && c.allTiles.some(isTerminal),
  "pure-orphans": (c) => std(c) && groups(c).every((g) => g.some(isTerminal)) && !c.allTiles.some(isHonor),
  "all-terminals": (c) => c.allTiles.every(isTerminal),
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
  "concealed-hand": (c) => c.method === "DISCARD" && !c.openHand,
  // ---- Pair / eyes ----
  "pair-258": (c) => std(c) && isNumbered(c.pair[0]) && [2, 5, 8].includes(rankOf(c.pair[0])),
  // ---- Wait types (which one counts is decided by the winning tile's place in this reading) ----
  "single-wait": (c) => c.waits.includes("single") && (c.config.singleWaitMode !== "only-one-tile" || c.completingTiles === 1),
  "closed-wait": (c) => c.waits.includes("closed"),
  "edge-wait": (c) => c.waits.includes("edge"),
  "two-sided-wait": (c) => c.waits.includes("twoSided"),
  // ---- Sequences ----
  "double-chow": (c) => { const k = chowsOf(c).map((s) => s.tiles[0]); return new Set(k).size < k.length; },
  "double-double-chows": (c) => { const cnt: Record<string, number> = {}; chowsOf(c).forEach((s) => { cnt[s.tiles[0]] = (cnt[s.tiles[0]] ?? 0) + 1; }); return Object.values(cnt).reduce((a, n) => a + Math.floor(n / 2), 0) >= 2; },
  "min-max-chow": (c) => SU.some((su) => chowHas(c, `1${su}`) && chowHas(c, `7${su}`)),
  "three-suits-chow": (c) => [1, 2, 3, 4, 5, 6, 7].some((r) => SU.every((su) => chowHas(c, `${r}${su}`))),
  // ---- Pungs ----
  "min-max-pung": (c) => SU.some((su) => pungHas(c, `1${su}`) && pungHas(c, `9${su}`)),
  "three-suits-pung": (c) => [1, 2, 3, 4, 5, 6, 7, 8, 9].some((r) => SU.every((su) => pungHas(c, `${r}${su}`))),
  "three-sequence-pung": (c) => consecutivePungs(c, 3),
  "four-sequence-pung": (c) => consecutivePungs(c, 4),
  // Ticked by the players (the tiles cannot show which pung came from a discard). Old hands saved without the flag keep the automatic check.
  "three-concealed-pungs": (c) => c.manual ? c.manual.includes("three-concealed-pungs") && pungsOf(c).length >= 3 : concealedPungCount(c) >= 3,
  "heavenly-hand": (c) => !!c.manual?.includes("heavenly-hand") && c.isDealer,
  "earthly-hand": (c) => !!c.manual?.includes("earthly-hand") && !c.isDealer && c.method === "DISCARD",
  "fully-exposed": (c) => !!c.manual?.includes("fully-exposed") && c.method === "DISCARD",
  "all-concealed-triplets": (c) => std(c) && c.sets.every((s) => s.type !== "CHOW") && concealedPungCount(c) === 4,
  // Four identical tiles split between one pung and one chow (not a kong).
  "four-into-one": (c) => std(c) && [...new Set(c.allTiles)].some((t) => c.allTiles.filter((x) => x === t).length === 4 &&
    !c.sets.some((s) => s.type === "KONG" && s.tiles[0] === t) && pungHas(c, t) && c.sets.some((s) => s.type === "CHOW" && s.tiles.includes(t as PlayTile))),
  // ---- Suits ----
  "lacking-a-suit": (c) => suits(c).size === 2 && !c.allTiles.some(isHonor),
  "all-types": (c) => suits(c).size === 3 && c.allTiles.some(isWind) && c.allTiles.some(isDragon),
  // ---- Winning ----
  "fully-concealed": (c) => c.method === "SELF_DRAW" && !c.openHand,
  // ---- Flowers ----
  "full-flowers": (c) => (["F", "S"] as const).filter((k) => [1, 2, 3, 4].every((n) => c.flowers.includes(`${k}${n}` as BonusTile))).length,
  "eight-flowers": (c) => c.flowers.length === 8,
};

/** One-line "why it qualified" for the scoring breakdown. Rules without an entry fall back to their summary. */
const L = (arr: string[]) => arr.join(" + ");
const setStr = (s: { tiles: string[] }) => s.tiles.join("");
export const PATTERN_WHY: Record<string, (c: ScoringContext) => string> = {
  "pair-258": (c) => `Pasangan ${c.pair.join("")} adalah angka 2, 5 atau 8`,
  "single-wait": (c) => c.config.singleWaitMode === "only-one-tile" ? "Hanya satu kartu yang bisa melengkapi tangan" : `Kartu menang ${c.winningTile} melengkapi pasangan (menunggu pasangan)`,
  "double-chow": (c) => `Dua chow sama: ${L(chowsOf(c).map(setStr))}`,
  "double-double-chows": (c) => `Dua pasang chow kembar: ${L(chowsOf(c).map(setStr))}`,
  "min-max-chow": (c) => `Chow 123 dan 789 satu jenis (${SU.find((su) => chowHas(c, `1${su}`) && chowHas(c, `7${su}`)) ?? ""})`,
  "min-max-pung": (c) => `Pong 1 dan pong 9 satu jenis (${SU.find((su) => pungHas(c, `1${su}`) && pungHas(c, `9${su}`)) ?? ""})`,
  "three-suits-chow": () => "Chow yang sama di ketiga jenis",
  "three-suits-pung": () => "Pong angka yang sama di ketiga jenis",
  "three-sequence-pung": () => "Tiga pong berurutan satu jenis",
  "four-sequence-pung": () => "Empat pong berurutan satu jenis",
  "three-concealed-pungs": (c) => c.manual ? "Tiga pong/kong tertutup (dicentang pemain)" : `${concealedPungCount(c)} pong tertutup`,
  "heavenly-hand": () => "Dong menang dengan tangan awal",
  "earthly-hand": () => "Pemain non-dong menang dari buangan pertama dong",
  "fully-exposed": () => "Semua set terbuka, menang dari buangan untuk melengkapi pasangan",
  "all-concealed-triplets": () => "Keempat set pong tertutup",
  "four-into-one": () => "Empat kartu sama terbagi pada satu pong dan satu chow",
  "lacking-a-suit": () => "Hanya dua jenis angka, tanpa kartu kehormatan",
  "all-types": () => "Ketiga jenis angka plus angin dan naga",
  "fully-concealed": () => "Self Draw tanpa set terbuka",
  "full-flowers": (c) => `Lengkap 4 bunga atau 4 musim (${c.flowers.join(" ")})`,
  "eight-flowers": () => "Delapan kartu bunga dan musim",
  "all-terminals": () => "Semua set pong/kong dari kartu 1 atau 9, pasangan 1 atau 9",
  "mixed-orphans": () => "Setiap set dan pasangan memuat kartu 1/9 atau kehormatan, ada kehormatan",
  "pure-orphans": () => "Setiap set dan pasangan memuat kartu 1 atau 9, tanpa kehormatan",
};
