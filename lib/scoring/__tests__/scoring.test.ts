import { describe, expect, it } from "vitest";
import { calculateScore, calculatePoints, calculateScoreDistribution, DEFAULT_GAME_CONFIG as CFG, FAN_TABLE, exampleToInput, parseTiles as T, parseMelds } from "../index";
import { findDecompositions } from "../combinations";
import type { WinningHandInput } from "../types";

const hand = (tiles: string, o: Partial<WinningHandInput> = {}): WinningHandInput => ({
  concealedTiles: T(tiles), melds: [], winningTile: T(tiles)[0], flowers: [], winningMethod: "DISCARD",
  winnerSeatWind: "W", roundWind: "N", isDealer: false, gameConfig: CFG, ...o,
});
const ids = (r: ReturnType<typeof calculateScore>) => r.detectedFan.map((f) => f.id);
const fanOf = (r: ReturnType<typeof calculateScore>, id: string) => r.detectedFan.find((f) => f.id === id)?.fan;

describe("single source of truth: HK18 table", () => {
  const expected: Record<string, number> = {
    "chicken-hand": 0, "all-chows": 1, "all-simples": 1, "pure-straight": 3, "all-pongs": 3, "mixed-orphans": 3, "pure-orphans": 5,
    "half-flush": 3, "full-flush": 7, "little-dragon": 5, "great-dragon": 8, "little-wind": 10, "great-wind": 13, "seven-pairs": 4,
    "all-honors": 10, "nine-gates": 15, "thirteen-orphans": 13, "four-kongs": 12,
    "seat-wind": 1, "round-wind": 1, "dragon-pong": 1, "suitable-flower": 1, "no-flower": 1, "self-draw": 1, "last-tile": 1, "robbing-kong": 1, "concealed-hand": 1,
  };
  it("matches the HK18 faan table exactly", () => {
    for (const [id, fan] of Object.entries(expected)) expect(FAN_TABLE.find((r) => r.id === id)?.fan).toBe(fan);
    expect(FAN_TABLE.length).toBe(Object.keys(expected).length);
  });
  it("has unique ids and minimum 3 faan, no cap", () => {
    expect(new Set(FAN_TABLE.map((r) => r.id)).size).toBe(FAN_TABLE.length);
    expect(CFG.minimumFan).toBe(3); expect(CFG.maximumFan).toBe(null);
  });
  it("every rule's tile example is a valid hand that actually triggers that rule", () => {
    for (const r of FAN_TABLE) {
      expect(r.example, r.id).toBeTruthy();
      const res = calculateScore(exampleToInput(r.example!));
      expect(res.errors, `${r.id}: ${res.errors.join()}`).toEqual([]);
      expect(ids(res), r.id).toContain(r.id);
    }
  });
  it("pattern examples show a complete 14-tile hand (kongs aside)", () => {
    for (const r of FAN_TABLE.filter((x) => x.category === "pattern" && x.id !== "four-kongs")) {
      const i = exampleToInput(r.example!);
      expect(i.concealedTiles.length + i.melds.length * 3, r.id).toBe(14);
    }
  });
});

describe("validation", () => {
  it("accepts a standard hand", () => expect(calculateScore(hand("123m 456m 789m 222p EE")).valid).toBe(true));
  it("rejects a hand that cannot form 4 sets + pair", () =>
    expect(calculateScore(hand("123m 456m 789m 222p E S")).errors.join()).toContain("4 sets and 1 pair"));
  it("rejects 5 copies of a tile", () =>
    expect(calculateScore(hand("1m 1m 1m 1m 1m 2m 3m 4m 5m 6m 7m 8m 9m 9m")).errors.join()).toContain("Too many copies"));
  it("rejects a missing winning tile", () => expect(calculateScore(hand("123m 456m 789m 222p EE", { winningTile: "5s" })).errors.join()).toContain("Winning tile is missing"));
  it("rejects a wrong tile count", () => expect(calculateScore(hand("123m 456m 789m EE")).errors.join()).toContain("Invalid tile count"));
  it("rejects robbing a kong on a self draw", () =>
    expect(calculateScore(hand("123m 456m 789m 222p EE", { winningMethod: "SELF_DRAW", isRobbingKong: true })).errors.join()).toContain("Robbing a Kong"));
  it("rejects duplicate flowers and unknown tiles", () => {
    expect(calculateScore(hand("123m 456m 789m 222p EE", { flowers: ["F1", "F1"] })).errors.join()).toContain("Duplicate");
    expect(() => T("123x")).toThrow();
  });
  it("treats a Kong as one set", () => {
    const r = calculateScore(hand("123m 456m 789p EE", { winningTile: "7p", melds: parseMelds("K:RD") }));
    expect(r.valid).toBe(true); expect(ids(r)).toContain("dragon-pong");
  });
  it("finds multiple decompositions and picks the best", () => {
    expect(findDecompositions(T("111m 222m 333m 555s 7p 7p"), 4).length).toBeGreaterThanOrEqual(2);
    expect(ids(calculateScore(hand("111m 222m 333m 555s 7p 7p")))).toContain("all-pongs");
  });
});

describe("minimum 3 faan", () => {
  it("rejects a hand below 3 faan but still reports the breakdown", () => {
    const r = calculateScore(hand("123m 456p 789s 111p 55s", { winningTile: "5s" }));
    expect(r.valid).toBe(true); expect(r.meetsMinimum).toBe(false); expect(r.canRecord).toBe(false);
    expect(ids(r)).toEqual(expect.arrayContaining(["chicken-hand", "no-flower", "concealed-hand"])); expect(r.totalFan).toBe(2);
  });
  it("accepts exactly 3 faan", () => {
    const r = calculateScore(hand("111m 999p 222s 555p 33s", { winningTile: "3s" }));
    expect(r.totalFan).toBe(3 + 1 + 1); expect(r.canRecord).toBe(true);
  });
  it("Chicken Hand is worth 0 and cannot satisfy the minimum by itself", () => {
    const r = calculateScore(hand("123m 456p 789s 111p 55s", { winningTile: "5s", flowers: ["F2"] }));
    expect(fanOf(r, "chicken-hand")).toBe(0); expect(r.meetsMinimum).toBe(false);
  });
  it("chicken hand reaching 3 only via bonus faan is a config switch", () => {
    const base = hand("123m 456p 789s 111p 55s", { winningTile: "5s", winningMethod: "SELF_DRAW", isLastTile: true });
    expect(calculateScore(base).totalFan).toBe(3); expect(calculateScore(base).canRecord).toBe(true);
    expect(calculateScore({ ...base, gameConfig: { ...CFG, chickenHandCanWinOnBonusFaan: false } }).canRecord).toBe(false);
  });
});

describe("additional faan and stacking", () => {
  it("self draw replaces concealed hand — never both", () => {
    const sd = calculateScore(hand("123m 456p 789s 111p 55s", { winningTile: "5s", winningMethod: "SELF_DRAW" }));
    expect(ids(sd)).toContain("self-draw"); expect(ids(sd)).not.toContain("concealed-hand");
    const dc = calculateScore(hand("123m 456p 789s 111p 55s", { winningTile: "5s" }));
    expect(ids(dc)).toContain("concealed-hand"); expect(ids(dc)).not.toContain("self-draw");
  });
  it("concealed hand is lost by an exposed meld, kept by a concealed kong", () => {
    const exposed = calculateScore(hand("123m 456p 55s", { winningTile: "5s", melds: parseMelds("+P:RD +C:789s") }));
    expect(ids(exposed)).not.toContain("concealed-hand");
    const kong = calculateScore(hand("123m 456p 55s", { winningTile: "5s", melds: parseMelds("K:RD C:789s") }));
    expect(ids(kong)).toContain("concealed-hand");
  });
  it("seat wind and round wind both count when both apply (East seat, East round)", () => {
    const r = calculateScore(hand("EEE 123m 456p 789s 55p", { winningTile: "5p", winnerSeatWind: "E", roundWind: "E" }));
    expect(ids(r)).toEqual(expect.arrayContaining(["seat-wind", "round-wind"]));
  });
  it("seat and round wind only count for the matching wind", () => {
    const r = calculateScore(hand("SSS 123m 456p 789s 55p", { winningTile: "5p", winnerSeatWind: "E", roundWind: "N" }));
    expect(ids(r)).not.toContain("seat-wind"); expect(ids(r)).not.toContain("round-wind");
  });
  it("counts one faan per dragon pong/kong", () => {
    const r = calculateScore(hand("RD RD RD GD GD GD 123m 456p 22s", { winningTile: "2s" }));
    expect(fanOf(r, "dragon-pong")).toBe(2);
  });
  it("flower mapping: seat number matches flower and season of the same number", () => {
    const east = calculateScore(hand("123m 456p 789s 111p 55s", { winningTile: "5s", winnerSeatWind: "E", flowers: ["F1", "S1", "F2", "S4"] }));
    expect(fanOf(east, "suitable-flower")).toBe(2);
    const south = calculateScore(hand("123m 456p 789s 111p 55s", { winningTile: "5s", winnerSeatWind: "S", flowers: ["F1", "S2", "S3"] }));
    expect(fanOf(south, "suitable-flower")).toBe(1);
    const north = calculateScore(hand("123m 456p 789s 111p 55s", { winningTile: "5s", winnerSeatWind: "N", flowers: ["S4"] }));
    expect(fanOf(north, "suitable-flower")).toBe(1);
  });
  it("No Flower only when there are no flowers at all", () => {
    expect(ids(calculateScore(hand("123m 456p 789s 111p 55s", { winningTile: "5s" })))).toContain("no-flower");
    const r = calculateScore(hand("123m 456p 789s 111p 55s", { winningTile: "5s", flowers: ["F3"] }));
    expect(ids(r)).not.toContain("no-flower");
  });
  it("last tile and robbing kong", () => {
    expect(ids(calculateScore(hand("123m 456p 789s 111p 55s", { winningTile: "5s", isLastTile: true })))).toContain("last-tile");
    expect(ids(calculateScore(hand("123m 456p 789s 111p 55s", { winningTile: "5s", isRobbingKong: true })))).toContain("robbing-kong");
  });
  it("the stacked example from the brief adds up from its own parts", () => {
    // All Pongs 3 + Seat 1 + Round 1 + Dragon 1 + Self Draw 1 + Suitable Flower 1
    const r = calculateScore(hand("EEE RD RD RD 111m 999p 55s", { winningTile: "5s", winningMethod: "SELF_DRAW", winnerSeatWind: "E", roundWind: "E", flowers: ["F1"] }));
    expect(r.detectedFan.map((f) => [f.id, f.fan]).sort()).toEqual([["all-pongs", 3], ["dragon-pong", 1], ["round-wind", 1], ["seat-wind", 1], ["self-draw", 1], ["suitable-flower", 1]].sort());
    expect(r.totalFan).toBe(8);
  });
});

describe("hand patterns", () => {
  const pat = (id: string, tiles: string, o: Partial<WinningHandInput> = {}) => expect(ids(calculateScore(hand(tiles, o)))).toContain(id);
  it("all chows requires a plain pair", () => {
    pat("all-chows", "123m 456m 234p 678s 55p");
    expect(ids(calculateScore(hand("123m 456m 234p 678s RD RD")))).not.toContain("all-chows");
    expect(ids(calculateScore(hand("123m 456m 234p 678s EE", { winnerSeatWind: "E" })))).not.toContain("all-chows");
  });
  it("all simples rejects 1, 9 and honors", () => {
    pat("all-simples", "234m 567p 345s 222p 66s");
    expect(ids(calculateScore(hand("234m 567p 345s 222p 99s")))).not.toContain("all-simples");
  });
  it("pure straight needs 123+456+789 in ONE suit", () => {
    pat("pure-straight", "123m 456m 789m 234p 55s");
    expect(ids(calculateScore(hand("123m 456p 789s 234p 55s")))).not.toContain("pure-straight");
  });
  it("half flush vs full flush are exclusive", () => {
    const h = calculateScore(hand("123m 456m 789m EEE 55m"));
    expect(ids(h)).toContain("half-flush"); expect(ids(h)).not.toContain("full-flush");
    const f = calculateScore(hand("123m 456m 789m 234m 55m"));
    expect(ids(f)).toContain("full-flush"); expect(ids(f)).not.toContain("half-flush"); expect(fanOf(f, "full-flush")).toBe(7);
  });
  it("mixed orphans, pure orphans and all honors absorb all pongs", () => {
    for (const [tiles, id] of [["111m 999p 111s EEE RD RD", "mixed-orphans"], ["111m 999m 111p 999p 11s", "pure-orphans"], ["EEE SSS RD RD RD GD GD GD WD WD", "all-honors"]] as const) {
      const r = calculateScore(hand(tiles)); expect(ids(r)).toContain(id); expect(ids(r)).not.toContain("all-pongs");
    }
    expect(ids(calculateScore(hand("EEE SSS RD RD RD GD GD GD WD WD")))).not.toContain("mixed-orphans");
  });
  it("little vs great dragon", () => {
    pat("little-dragon", "RD RD RD GD GD GD 123m 456p WD WD");
    const g = calculateScore(hand("RD RD RD GD GD GD WD WD WD 123m 55p")); expect(ids(g)).toContain("great-dragon"); expect(ids(g)).not.toContain("little-dragon");
  });
  it("little vs great wind", () => {
    pat("little-wind", "EEE SSS WWW 123m NN");
    const g = calculateScore(hand("EEE SSS WWW NNN 55p")); expect(ids(g)).toContain("great-wind"); expect(ids(g)).not.toContain("little-wind"); expect(ids(g)).not.toContain("all-pongs");
  });
  it("seven pairs bypasses 4 sets + pair and combines with flush/simples", () => {
    const r = calculateScore(hand("22m 33m 44m 55m 66m 77m 88m"));
    expect(r.valid).toBe(true); expect(r.handDecomposition?.kind).toBe("SEVEN_PAIRS");
    expect(ids(r)).toEqual(expect.arrayContaining(["seven-pairs", "full-flush", "all-simples"]));
  });
  it("four of a kind is NOT two pairs", () => {
    expect(calculateScore(hand("11m 11m 33m 55p 77p 99s 22s")).valid).toBe(false);
  });
  it("thirteen orphans bypasses the standard structure", () => {
    const r = calculateScore(hand("1m 9m 1p 9p 1s 9s E S W N RD GD WD 1m"));
    expect(r.handDecomposition?.kind).toBe("THIRTEEN_ORPHANS"); expect(fanOf(r, "thirteen-orphans")).toBe(13); expect(ids(r)).not.toContain("mixed-orphans");
  });
  it("nine gates, and an ordinary one-suit hand is not nine gates", () => {
    const r = calculateScore(hand("1112345678999m 5m", { winningTile: "5m" }));
    expect(ids(r)).toContain("nine-gates"); expect(ids(r)).not.toContain("full-flush"); expect(fanOf(r, "nine-gates")).toBe(15);
    expect(ids(calculateScore(hand("123m 456m 789m 234m 55m")))).not.toContain("nine-gates");
    expect(ids(calculateScore(hand("1112345678999m 1m", { winningTile: "1m" })))).toContain("nine-gates");
  });
  it("four kongs", () => {
    const r = calculateScore(hand("55s", { winningTile: "5s", melds: parseMelds("+K:1m +K:RD K:9p +K:E") }));
    expect(ids(r)).toContain("four-kongs"); expect(ids(r)).not.toContain("all-pongs");
  });
});

describe("explicit stacking toggles (review items)", () => {
  const dragons = hand("RD RD RD GD GD GD 123m 456p WD WD");
  it("default stacks dragon pongs with Little Dragon and flags it for review", () => {
    const r = calculateScore(dragons); expect(fanOf(r, "little-dragon")).toBe(5); expect(fanOf(r, "dragon-pong")).toBe(2); expect(r.reviewFlags.length).toBeGreaterThan(0);
  });
  it("can be switched off in the configuration", () => {
    const r = calculateScore({ ...dragons, gameConfig: { ...CFG, dragonPongStacksWithDragonHands: false } });
    expect(ids(r)).not.toContain("dragon-pong"); expect(r.excludedFan[0].byId).toBe("little-dragon");
  });
  it("wind toggle", () => {
    const w = hand("EEE SSS WWW NNN 55p", { winnerSeatWind: "E", winningTile: "5p" });
    expect(ids(calculateScore(w))).toContain("seat-wind");
    expect(ids(calculateScore({ ...w, gameConfig: { ...CFG, windPongStacksWithWindHands: false } }))).not.toContain("seat-wind");
  });
});

describe("determinism and points", () => {
  it("same input, same output", () => {
    const i = hand("111m 222m 333m 555s 7p 7p", { winningTile: "7p" });
    expect(JSON.stringify(calculateScore(i))).toBe(JSON.stringify(calculateScore(i)));
  });
  it("points equal faan (no multiplier, no money)", () => {
    expect(calculatePoints(9, CFG)).toBe(9); expect(calculatePoints(0, CFG)).toBe(0);
  });
});

describe("score settlement", () => {
  const p = { playerIds: ["a", "b", "c", "d"], dealerId: "a", basePoints: 5, config: CFG };
  it("self draw: each other player pays the total; zero-sum", () => {
    const d = calculateScoreDistribution({ ...p, winnerId: "b", method: "SELF_DRAW" });
    expect(d.winner.points).toBe(15); expect(d.payments.every((x) => x.points === 5)).toBe(true);
  });
  it("discard win: only the discarder pays", () => {
    const d = calculateScoreDistribution({ ...p, winnerId: "b", discarderId: "c", method: "DISCARD" });
    expect(d.winner.points).toBe(5); expect(d.payments.find((x) => x.playerId === "c")?.points).toBe(5); expect(d.payments.find((x) => x.playerId === "d")?.points).toBe(0);
  });
  it("discard win needs a valid discarder", () => {
    expect(() => calculateScoreDistribution({ ...p, winnerId: "b", method: "DISCARD" })).toThrow();
    expect(() => calculateScoreDistribution({ ...p, winnerId: "b", discarderId: "b", method: "DISCARD" })).toThrow();
  });
  it("configurable dealer/split rules still balance", () => {
    const cfg = { ...CFG, discardRules: { dealerMultiplier: 2, paymentMode: "DISCARDER_FULL_OTHERS_HALF" as const } };
    const d = calculateScoreDistribution({ ...p, config: cfg, winnerId: "a", discarderId: "c", method: "DISCARD" });
    expect(d.winner.points).toBe(d.payments.reduce((s, x) => s + x.points, 0));
  });
  it("calculateScore attaches settlement only when the minimum is met", () => {
    const ok = calculateScore(hand("111m 999p 222s 555p 33s", { winningTile: "3s" }), { players: { winnerId: "b", discarderId: "c", dealerId: "a", playerIds: ["a", "b", "c", "d"] } });
    expect(ok.scoreDistribution?.winner.points).toBe(5);
    const low = calculateScore(hand("123m 456p 789s 111p 55s", { winningTile: "5s" }), { players: { winnerId: "b", discarderId: "c", dealerId: "a", playerIds: ["a", "b", "c", "d"] } });
    expect(low.scoreDistribution).toBeUndefined();
  });
});
