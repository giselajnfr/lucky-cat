import { findDecompositions } from "./combinations";
import { detectSpecialHands } from "./specialHands";
import { countTiles, isBonus, isNumbered, isPlayTile, rankOf, suitOf } from "./tiles";
import type { HandDecomposition, Meld, WinningHandInput } from "./types";

export function validateMeld(m: Meld): string | null {
  const t = m.tiles;
  if (m.type === "CHOW") {
    const ok = t.length === 3 && t.every((x) => isNumbered(x) && suitOf(x) === suitOf(t[0])) &&
      [...t].map(rankOf).sort((a, b) => a - b).every((r, i, a) => i === 0 || r === a[i - 1] + 1);
    return ok ? null : `Invalid Chow: ${t.join(" ")}`;
  }
  const size = m.type === "PUNG" ? 3 : 4; // a Kong has 4 physical tiles but is ONE logical set
  return t.length === size && t.every((x) => x === t[0]) ? null : `Invalid ${m.type === "PUNG" ? "Pung" : "Kong"}: ${t.join(" ")}`;
}

export function validateHand(input: WinningHandInput): { errors: string[]; decompositions: HandDecomposition[] } {
  const errors: string[] = [];
  const { concealedTiles, melds, winningTile, flowers } = input;

  if (melds.length > 4) errors.push("Too many melds: a hand has at most 4 sets");
  for (const x of [...concealedTiles, ...melds.flatMap((m) => m.tiles), winningTile])
    if (!isPlayTile(x)) errors.push(`Unknown tile: ${String(x)}`);
  for (const f of flowers) if (!isBonus(f)) errors.push(`Unknown bonus tile: ${String(f)}`);
  if (new Set(flowers).size !== flowers.length) errors.push("Duplicate flower/season tile");
  melds.forEach((m) => { const e = validateMeld(m); if (e) errors.push(e); });
  if (errors.length) return { errors, decompositions: [] };

  const all = [...concealedTiles, ...melds.flatMap((m) => m.tiles)];
  for (const [tile, n] of Object.entries(countTiles(all)))
    if (n > 4) errors.push(`Too many copies of the same tile: ${n}× ${tile} (max 4)`);
  if (!concealedTiles.includes(winningTile)) errors.push("Winning tile is missing from the hand");
  if (input.isRobbingKong && input.winningMethod !== "DISCARD") errors.push("Robbing a Kong is only possible on a discard win");

  const expected = 3 * (4 - melds.length) + 2;
  if (concealedTiles.length !== expected)
    errors.push(`Invalid tile count: with ${melds.length} meld(s) expected ${expected} concealed tiles (incl. winning tile), got ${concealedTiles.length}`);
  if (errors.length) return { errors, decompositions: [] };

  const fixed: Meld[] = melds;
  const standard: HandDecomposition[] = findDecompositions(concealedTiles, 4 - melds.length)
    .map((s) => ({ kind: "STANDARD" as const, sets: [...fixed, ...s.sets], pair: s.pair }));
  const decompositions = [...standard, ...detectSpecialHands(input)];
  if (!decompositions.length) errors.push("Hand cannot form 4 sets and 1 pair");
  return { errors, decompositions };
}
