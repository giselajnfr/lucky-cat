import type { BonusTile, HandDecomposition, Meld, PlayTile, RuleExample, ScoringContext, SetType, WinningHandInput } from "./types";
import { DEFAULT_GAME_CONFIG } from "./hk18Rules";

/** Build the context that fan rules inspect, for one candidate decomposition. */
export function buildContext(input: WinningHandInput, d: HandDecomposition): ScoringContext {
  return {
    kind: d.kind, sets: d.sets, pair: d.pair,
    allTiles: [...input.concealedTiles, ...input.melds.flatMap((m) => m.tiles)],
    flowers: input.flowers, method: input.winningMethod, seatWind: input.winnerSeatWind,
    roundWind: input.roundWind, isDealer: input.isDealer, winningTile: input.winningTile,
    declaredMelds: input.melds, isLastTile: !!input.isLastTile, isRobbingKong: !!input.isRobbingKong, config: input.gameConfig,
  };
}

const TOKEN = /(\d+[msp])|RD|GD|WD|[FS][1-4]|[ESWN]/g;
/**
 * "123m 456s EEE RD RD" -> tiles. Numbered groups expand ("123m"), honor runs expand ("EEE").
 * Throws on anything it cannot read so typos never become silent tiles.
 */
export function parseTiles(s: string): PlayTile[] {
  const out: string[] = [];
  for (const tok of s.trim().split(/\s+/).filter(Boolean)) {
    const parts = tok.match(TOKEN);
    if (!parts || parts.join("") !== tok) throw new Error(`Unreadable tile token: "${tok}"`);
    for (const p of parts) out.push(...(/^\d+[msp]$/.test(p) ? [...p.slice(0, -1)].map((n) => `${n}${p.slice(-1)}`) : [p]));
  }
  return out as PlayTile[];
}

/** "+P:RD K:5m +C:123m" -> melds. "+" marks an exposed meld; P=pung C=chow K=kong. */
export function parseMelds(s = ""): Meld[] {
  return s.trim().split(/\s+/).filter(Boolean).map((tok) => {
    const m = /^(\+?)([PCK]):(.+)$/.exec(tok);
    if (!m) throw new Error(`Unreadable meld: "${tok}"`);
    const base = parseTiles(m[3]);
    const type: SetType = m[2] === "C" ? "CHOW" : m[2] === "P" ? "PUNG" : "KONG";
    const tiles = type === "CHOW" ? base : Array(type === "PUNG" ? 3 : 4).fill(base[0]);
    return { type, tiles, exposed: m[1] === "+" };
  });
}

/** Turn a rule example into a scoring input (used by the House Rules page and by tests). */
export function exampleToInput(e: RuleExample): WinningHandInput {
  return {
    concealedTiles: parseTiles(e.hand), melds: parseMelds(e.melds), winningTile: parseTiles(e.win)[0],
    flowers: (e.flowers ? e.flowers.trim().split(/\s+/) : []) as BonusTile[],
    winningMethod: e.method ?? "DISCARD", winnerSeatWind: e.seat ?? "W", roundWind: e.round ?? "N", isDealer: false,
    isLastTile: e.lastTile, isRobbingKong: e.robbingKong, gameConfig: DEFAULT_GAME_CONFIG,
  };
}
