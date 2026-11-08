import { describe, expect, it } from "vitest";
import { parseHandRequest } from "../payload";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const good = { type: "win", requestId: id(1), expectedHand: 1, winnerId: id(2), method: "SELF_DRAW", concealedTiles: ["1m", "1m"], melds: [{ type: "PUNG", tiles: ["E", "E", "E"], exposed: true }], winningTile: "1m", flowers: ["F1"] };

describe("hand request validation (untrusted input)", () => {
  it("accepts a well-formed win and a draw", () => {
    expect(parseHandRequest(good).ok).toBe(true);
    expect(parseHandRequest({ type: "draw", requestId: id(1), expectedHand: 3 }).ok).toBe(true);
  });
  it("ignores any client-supplied totals", () => {
    const r = parseHandRequest({ ...good, totalFan: 99, changes: [{ playerId: "x", change: 1e9 }] });
    expect(r.ok).toBe(true);
    expect(JSON.stringify(r)).not.toContain("99"); expect(JSON.stringify(r)).not.toContain("changes");
  });
  it("rejects malformed bodies", () => {
    for (const bad of [null, [], "x", {}, { ...good, requestId: "nope" }, { ...good, expectedHand: 0 }, { ...good, expectedHand: 1.5 }, { ...good, type: "x" },
      { ...good, method: "TSUMO" }, { ...good, winnerId: "p1" }, { ...good, winningTile: "9z" }, { ...good, concealedTiles: ["1m", "zz"] },
      { ...good, concealedTiles: Array(15).fill("1m") }, { ...good, flowers: ["E"] }, { ...good, melds: [{ type: "PUNG", tiles: ["E"], exposed: "yes" }] },
      { ...good, melds: Array(5).fill({ type: "PUNG", tiles: ["E", "E", "E"], exposed: true }) }, { ...good, discarderId: 5 }])
      expect(parseHandRequest(bad).ok).toBe(false);
  });
});
