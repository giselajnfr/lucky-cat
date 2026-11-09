import { describe, expect, it } from "vitest";
import { initialState, scoreHandForGame, type SeatedPlayer } from "../../game-engine";
import { parseMelds, parseTiles as T } from "../../scoring";
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

  it("Chicken Hand: every valid win is exactly 1 point, no faan, whatever the hand", () => {
    const plain = scoreHandForGame(initialState(), players, chicken, cfg(0));
    const big = scoreHandForGame(initialState(), players, fivePongs, cfg(0));   // a 5-faan hand is still only 1 point
    for (const r of [plain, big]) { if ("error" in r) throw new Error(r.error); expect(r.result.totalFan).toBe(0); expect(r.result.detectedFan).toEqual([]); expect(r.result.basePoints).toBe(1); }
    if ("error" in plain || "error" in big) return;
    expect(plain.changes.find((c) => c.playerId === "p1")!.change).toBe(1);        // discard: the discarder pays 1
    expect(big.changes.find((c) => c.playerId === "p1")!.change).toBe(3);          // self draw: each of the 3 opponents pays 1
    expect(big.changes.reduce((s, c) => s + c.change, 0)).toBe(0);
  });
  it("Chicken Hand still rejects an invalid hand", () => {
    expect("error" in scoreHandForGame(initialState(), players, { ...chicken, concealedTiles: T("456p 789s 55s 1m") }, cfg(0))).toBe(true);
  });
  it("Beginner and Advanced refuse a plain hand", () => {
    expect("error" in scoreHandForGame(initialState(), players, chicken, cfg(3))).toBe(true);
    expect("error" in scoreHandForGame(initialState(), players, chicken, cfg(5))).toBe(true);
  });

  it("a 5-faan hand meets both Beginner and Advanced", () => {
    for (const min of [3, 5]) expect("error" in scoreHandForGame(initialState(), players, fivePongs, cfg(min))).toBe(false);
  });
});

describe("faan cap", () => {
  it("without a cap faan are paid in full", () => {
    const r = scoreHandForGame(initialState(), players, fivePongs, cfg(3));
    if ("error" in r) throw new Error(r.error);
    expect(r.result.totalFan).toBe(5); expect(r.changes.find((c) => c.playerId === "p1")!.change).toBe(15);
  });
  it("with a cap the hand is paid as the cap and stays zero-sum", () => {
    const r = scoreHandForGame(initialState(), players, fivePongs, cfg(3, 4));
    if ("error" in r) throw new Error(r.error);
    expect(r.result.rawFan).toBe(5); expect(r.result.totalFan).toBe(4);
    expect(r.changes.find((c) => c.playerId === "p1")!.change).toBe(12);
    expect(r.changes.reduce((s, c) => s + c.change, 0)).toBe(0);
  });
  it("a cap above the hand's value changes nothing", () => {
    const r = scoreHandForGame(initialState(), players, fivePongs, cfg(3, 13));
    if ("error" in r) throw new Error(r.error);
    expect(r.result.totalFan).toBe(5);
  });
});
