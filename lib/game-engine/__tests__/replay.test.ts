import { describe, expect, it } from "vitest";
import { initialState, replayGame, type Outcome, type SeatedPlayer, type StoredHand } from "../index";
import { DEFAULT_GAME_CONFIG as CFG, parseTiles as T } from "../../scoring";

const players: SeatedPlayer[] = ["Ana", "Budi", "Cici", "Dedi"].map((name, i) => ({ id: "p" + i, seat: i, name, score: 0 }));
// All Pongs, no flowers: comfortably above the 3 faan minimum.
const win = (winnerId: string, discarderId?: string): Outcome => ({ type: "win", hand: {
  winnerId, discarderId, method: discarderId ? "DISCARD" : "SELF_DRAW", concealedTiles: T("111m 999m 222p 555s 3p 3p"), melds: [], winningTile: "3p", flowers: [],
} });
const H = (id: string, o: Outcome): StoredHand => ({ id, outcome: o });
const start = initialState("east");

describe("replayGame", () => {
  it("every hand balances to zero and the final scores add up", () => {
    const r = replayGame(start, players, [H("h1", win("p1", "p0")), H("h2", win("p2")), H("h3", { type: "draw" })], CFG);
    if (!r.ok) throw new Error(r.error);
    for (const h of r.hands) expect(h.scoreChanges.reduce((s, c) => s + c.change, 0)).toBe(0);
    expect(Object.values(r.scores).reduce((a, b) => a + b, 0)).toBe(0);
    expect(r.hands[0].handNumber).toBe(1); expect(r.hands[2].handNumber).toBe(3);
  });

  it("dealer win keeps the deal, a non-dealer win passes it on", () => {
    const r = replayGame(start, players, [H("h1", win("p0", "p1")), H("h2", win("p2", "p1"))], CFG);
    if (!r.ok) throw new Error(r.error);
    expect(r.hands[0].dealerPlayerId).toBe("p0"); expect(r.hands[1].dealerPlayerId).toBe("p0");   // p0 (dealer) won, so still p0
    expect(r.final.dealer_seat).toBe(1);                                                          // p2 won -> deal passes to seat 1
  });

  it("editing an early hand re-deals every later hand", () => {
    const before = replayGame(start, players, [H("h1", win("p0", "p1")), H("h2", win("p3", "p2"))], CFG);
    const after = replayGame(start, players, [H("h1", win("p1", "p0")), H("h2", win("p3", "p2"))], CFG);   // hand 1 winner changed
    if (!before.ok || !after.ok) throw new Error("replay failed");
    expect(before.hands[1].dealerPlayerId).toBe("p0");   // dealer won hand 1 and kept the deal
    expect(after.hands[1].dealerPlayerId).toBe("p1");    // now the deal moved on
    expect(before.hands[1].stateBefore.dealer_seat).not.toBe(after.hands[1].stateBefore.dealer_seat);
    expect(after.scores.p0).toBeLessThan(0);
  });

  it("stores the running score after each hand", () => {
    const r = replayGame(start, players, [H("h1", win("p1", "p0")), H("h2", win("p1", "p3"))], CFG);
    if (!r.ok) throw new Error(r.error);
    const w1 = r.hands[0].scoreChanges.find((c) => c.playerId === "p1")!, w2 = r.hands[1].scoreChanges.find((c) => c.playerId === "p1")!;
    expect(w2.scoreAfter).toBe(w1.scoreAfter + w2.change);
  });

  it("reports which hand became invalid", () => {
    const bad: Outcome = { type: "win", hand: { winnerId: "p1", discarderId: "p1", method: "DISCARD", concealedTiles: T("111m 999m 222p 555s 3p 3p"), melds: [], winningTile: "3p", flowers: [] } };
    const r = replayGame(start, players, [H("h1", win("p1", "p0")), H("h2", bad)], CFG);
    expect(r.ok).toBe(false); if (!r.ok) expect(r.handNumber).toBe(2);
  });
});
