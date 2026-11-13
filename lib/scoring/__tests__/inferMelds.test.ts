import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG as CFG, calculateScore, flattenHand, maxTilesFor, meldCandidates, parseMelds, parseTiles as T } from "..";
import type { PlayTile, WinningHandInput } from "..";

const input = (concealedTiles: PlayTile[], over: Partial<WinningHandInput> = {}): WinningHandInput => ({
  concealedTiles, melds: [], winningTile: concealedTiles[concealedTiles.length - 1], flowers: [], winningMethod: "DISCARD",
  winnerSeatWind: "S", roundWind: "E", isDealer: false, gameConfig: CFG, ...over,
});
const ids = (r: ReturnType<typeof calculateScore>) => r.detectedFan.map((f) => f.id);

describe("kongs are recognised from the tile count", () => {
  it("14 tiles: no kong, even with four of a kind (111 + a 1 in a chow)", () => {
    const c = meldCandidates(T("111m 1m 23m 456p 789s 55p"));
    expect(c.length).toBe(1); expect(c[0].melds.length).toBe(0); expect(c[0].concealed.length).toBe(14);
  });
  it("15 tiles with one four-of-a-kind: that group is the kong", () => {
    const c = meldCandidates(T("1111m 456p 789s 234s 55p"));
    expect(c.length).toBe(1); expect(c[0].melds).toEqual([{ type: "KONG", tiles: ["1m", "1m", "1m", "1m"], exposed: false }]); expect(c[0].concealed.length).toBe(11);
  });
  it("15 tiles without any four of a kind cannot be read, and the 15th tile is not allowed", () => {
    const t = T("123m 456p 789s 234s 555p 6s");
    expect(meldCandidates(t)).toEqual([]);
    expect(maxTilesFor(T("123m 456p 789s 234s 55p 66s"))).toBe(14);
  });
  it("16 tiles: two kongs", () => {
    const c = meldCandidates(T("1111m 2222p 789s 234s 55p"));
    expect(c.length).toBe(1); expect(c[0].melds.length).toBe(2); expect(c[0].concealed.length).toBe(8);
  });
  it("15 tiles with two four-of-a-kinds: both readings are offered", () => expect(meldCandidates(T("1111m 2222p 789s 55p 45s")).length).toBe(2));
  it("a saved hand flattens back to the same tiles", () => {
    const flat = flattenHand(T("456p 55s"), parseMelds("+C:123m K:1p"));
    expect(flat.length).toBe(12);   // 456p 55s + 123m + 1111p
    expect(flat.slice().sort()).toEqual(T("456p 55s 123m 1111p").slice().sort());
  });
});

describe("chows and pongs need no declaring", () => {
  it("a flat concealed hand scores exactly like the same hand with declared concealed sets", () => {
    const flat = T("123m 222s 999p 456s 77p");
    const r = calculateScore(input(flat));
    expect(r.valid).toBe(true); expect(r.totalFan).toBeGreaterThan(0);
    const declared = calculateScore(input(T("123m 456s 77p"), { melds: parseMelds("P:2s P:9p"), winningTile: "7p" }));
    expect(r.totalFan).toBe(declared.totalFan);
  });
  it("a kong found from 15 tiles scores like a declared concealed kong", () => {
    const flat = T("1111m 456p 789s 234s 55p");
    const cand = meldCandidates(flat)[0];
    const viaFlat = calculateScore(input(cand.concealed, { melds: cand.melds, winningTile: "5p" }));
    const declared = calculateScore(input(T("456p 789s 234s 55p"), { melds: parseMelds("K:1m"), winningTile: "5p" }));
    expect(viaFlat.valid).toBe(true); expect(viaFlat.totalFan).toBe(declared.totalFan);
  });
});

describe("opened sets (taken from a discard) are the player's call", () => {
  const h = T("123m 456p 789s 234s 55p");
  it("a discard win with no opened set is a Concealed Hand", () => expect(ids(calculateScore(input(h, { winningTile: "5p" })))).toContain("concealed-hand"));
  it("flagging an opened set removes Concealed Hand", () => {
    expect(ids(calculateScore(input(h, { winningTile: "5p", hasOpenMelds: true })))).not.toContain("concealed-hand");
  });
  it("seven pairs cannot be won with an opened set", () => {
    const pairs = T("11m 33m 55p 77p 99s 22s EE");
    expect(calculateScore(input(pairs, { winningTile: "E" })).valid).toBe(true);
    expect(calculateScore(input(pairs, { winningTile: "E", hasOpenMelds: true })).valid).toBe(false);
  });
});
