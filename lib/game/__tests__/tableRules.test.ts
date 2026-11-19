import { describe, expect, it } from "vitest";
import { initialState, scoreHandForGame, type SeatedPlayer } from "../../game-engine";
import { calculateScore, parseMelds, parseTiles as T } from "../../scoring";
import { configForGame } from "../config";
import { PRESETS } from "../presets";

const players: SeatedPlayer[] = ["Ana", "Budi", "Cici", "Dedi"].map((name, i) => ({ id: "p" + i, seat: i, name, score: 0 }));
const cfg = (min_fan: number, max_fan: number | null = null) => configForGame({ min_fan, max_fan, last_round_wind: "north", rule_preset: min_fan === 0 ? "chicken" : "beginner" });

// Exposed melds, a flower that is not Budi's seat flower, win on a discard: no pattern, no bonus = 0 faan.
const chicken = { winnerId: "p1", method: "DISCARD" as const, discarderId: "p2", concealedTiles: T("456p 789s 55s"), melds: parseMelds("+C:123m +P:999p"), winningTile: "5s" as const, flowers: ["F4" as const] };
// All pongs (3) + self draw (1) + no flower (1) = 5 faan.
const fivePongs = { winnerId: "p1", method: "SELF_DRAW" as const, concealedTiles: T("111m 999p 222s 555p 33s"), melds: [], winningTile: "3s" as const, flowers: [] };

describe("rule book chosen by the players", () => {
  it("presets map to 0 / 3 / 5 minimum faan", () => expect(PRESETS.map((p) => [p.id, p.minFan])).toEqual([["chicken", 0], ["beginner", 3], ["advanced", 5]]));

  it("Chicken Hand: every valid win is exactly +1 for the winner, nobody pays, no faan", () => {
    const plain = scoreHandForGame(initialState(), players, chicken, cfg(0));
    const big = scoreHandForGame(initialState(), players, fivePongs, cfg(0));   // a 5-faan hand is still only 1 point
    for (const r of [plain, big]) { if ("error" in r) throw new Error(r.error); expect(r.result.totalFan).toBe(0); expect(r.result.detectedFan).toEqual([]); expect(r.result.basePoints).toBe(1); }
    if ("error" in plain || "error" in big) return;
    // Chicken Hand: the winner gets exactly +1 (discard or self draw) and nobody pays for it.
    for (const r of [plain, big]) expect(r.changes).toEqual([{ playerId: "p1", change: 1 }]);
  });
  it("Chicken Hand still rejects an invalid hand", () => {
    expect("error" in scoreHandForGame(initialState(), players, { ...chicken, concealedTiles: T("456p 789s 55s 1m") }, cfg(0))).toBe(true);
  });
  it("Beginner and Advanced refuse a plain hand", () => {
    expect("error" in scoreHandForGame(initialState(), players, chicken, cfg(3))).toBe(true);
    expect("error" in scoreHandForGame(initialState(), players, chicken, cfg(5))).toBe(true);
  });

  it("flower points do not count toward the minimum: 5 faan with No Flower meets Beginner but not Advanced", () => {
    // fivePongs = all pongs 3 + self draw 1 + no flower 1; for the minimum only 4 faan count.
    expect("error" in scoreHandForGame(initialState(), players, fivePongs, cfg(3))).toBe(false);
    expect("error" in scoreHandForGame(initialState(), players, fivePongs, cfg(5))).toBe(true);
  });
  it("a hand with 5 faan from other patterns meets Advanced", () => {
    const sixFaan = { ...fivePongs, flowers: ["F2" as const, "F3" as const], manualFan: ["self-draw-after-kong"] };   // 3 + 1 + 1 (no flower points) = 5
    expect("error" in scoreHandForGame(initialState(), players, sixFaan, cfg(5))).toBe(false);
  });
});

describe("faan cap", () => {
  it("without a cap faan are paid in full", () => {
    const r = scoreHandForGame(initialState(), players, fivePongs, cfg(3));
    if ("error" in r) throw new Error(r.error);
    // 5 faan = 24 base points (faan table); a self draw charges each opponent 2x = 48, so the winner collects 144
    expect(r.result.totalFan).toBe(5); expect(r.result.basePoints).toBe(24); expect(r.changes.find((c) => c.playerId === "p1")!.change).toBe(144);
  });
  it("with a cap the hand is paid as the cap and stays zero-sum", () => {
    const r = scoreHandForGame(initialState(), players, fivePongs, cfg(3, 4));
    if ("error" in r) throw new Error(r.error);
    expect(r.result.rawFan).toBe(5); expect(r.result.totalFan).toBe(4);
    // capped at 4 faan = 16 base; x2 x3 opponents = 96
    expect(r.result.basePoints).toBe(16); expect(r.changes.find((c) => c.playerId === "p1")!.change).toBe(96);
    expect(r.changes.reduce((s, c) => s + c.change, 0)).toBe(0);
  });
  it("a cap above the hand's value changes nothing", () => {
    const r = scoreHandForGame(initialState(), players, fivePongs, cfg(3, 13));
    if ("error" in r) throw new Error(r.error);
    expect(r.result.totalFan).toBe(5);
  });
});

describe("flower points and the minimum", () => {
  const flowerOnly = { winnerId: "p1", method: "DISCARD" as const, discarderId: "p2", concealedTiles: T("123m 456p 789s 111p 55s"), melds: [], winningTile: "5s" as const, flowers: [] };
  it("no-flower / flower faan do not help a hand reach the minimum", () => {
    const r = calculateScore({ concealedTiles: flowerOnly.concealedTiles, melds: [], winningTile: "5s", flowers: [], winningMethod: "DISCARD", winnerSeatWind: "S", roundWind: "E", isDealer: false, gameConfig: cfg(3) });
    expect(r.detectedFan.some((f) => f.id === "no-flower")).toBe(true);   // no-flower is counted in the total...
    expect(r.meetsMinimum).toBe(false);          // ...but it cannot lift a plain hand to the minimum
  });
  it("flower faan are still added to the total once the minimum is reached", () => {
    const r = scoreHandForGame(initialState(), players, fivePongs, cfg(3));
    if ("error" in r) throw new Error(r.error);
    expect(r.result.detectedFan.some((f) => f.id === "no-flower")).toBe(true);
    expect(r.result.totalFan).toBe(5);   // pongs 3 + self draw 1 + no flower 1
  });
});

describe("Seven Pairs", () => {
  it("rejects the same pair twice with a clear message", () => {
    const r = calculateScore({ concealedTiles: T("11m 11m 33m 55p 77p 99s 22s"), melds: [], winningTile: "2s", flowers: [], winningMethod: "DISCARD", winnerSeatWind: "E", roundWind: "E", isDealer: true, gameConfig: cfg(3) });
    expect(r.valid).toBe(false); expect(r.errors[0]).toMatch(/Seven Pairs.*same pair/);
  });
});
