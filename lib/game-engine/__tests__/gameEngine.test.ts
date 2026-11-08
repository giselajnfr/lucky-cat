import { describe, expect, it } from "vitest";
import { advance, initialState, seatWindOf, rankPlayers, scoreHandForGame, type GameState, type SeatedPlayer } from "../index";
import { DEFAULT_GAME_CONFIG as CFG, parseTiles as T, parseMelds } from "../../scoring";

const players: SeatedPlayer[] = ["Ana", "Budi", "Cici", "Dedi"].map((name, i) => ({ id: "p" + i, seat: i, name, score: 0 }));
/** A non-dealer wins, so the deal always passes on. */
const lose = (s: GameState) => advance(s, { type: "win", winnerSeat: (s.dealerSeat + 1) % 4 }, CFG);

describe("seat winds follow the dealer", () => {
  it("dealer is East, others follow", () => {
    expect([0, 1, 2, 3].map((s) => seatWindOf(s, 0))).toEqual(["E", "S", "W", "N"]);
    expect([0, 1, 2, 3].map((s) => seatWindOf(s, 2))).toEqual(["W", "N", "E", "S"]);
  });
});

describe("dealer and round progression", () => {
  it("dealer win keeps the deal", () => {
    const r = advance(initialState(), { type: "win", winnerSeat: 0 }, CFG);
    expect(r.state.dealerSeat).toBe(0); expect(r.dealerChanged).toBe(false); expect(r.state.handsPlayed).toBe(1);
  });
  it("a draw keeps the deal (HK18) and awards nothing", () => {
    const r = advance(initialState(), { type: "draw" }, CFG);
    expect(r.state.dealerSeat).toBe(0); expect(r.dealerChanged).toBe(false);
  });
  it("draw can rotate the dealer when configured", () => {
    const cfg = { ...CFG, progression: { ...CFG.progression, drawKeepsDealer: false } };
    expect(advance(initialState(), { type: "draw" }, cfg).state.dealerSeat).toBe(1);
  });
  it("non-dealer win passes the deal to the next seat", () => {
    const r = lose(initialState());
    expect(r.state.dealerSeat).toBe(1); expect(r.state.dealerRotations).toBe(1); expect(r.dealerChanged).toBe(true); expect(r.roundChanged).toBe(false);
  });
  it("after four dealer changes the round wind advances", () => {
    let s = initialState(); let last = lose(s);
    for (let i = 0; i < 3; i++) { s = last.state; expect(s.roundWind).toBe("east"); last = lose(s); }
    expect(last.roundChanged).toBe(true); expect(last.state.roundWind).toBe("south"); expect(last.state.dealerSeat).toBe(0); expect(last.state.dealerRotations).toBe(0);
  });
  it("a full East-South-West-North game is 16 dealer changes and then ends", () => {
    let s = initialState(); let changes = 0; let over = false;
    while (!over && changes < 100) { const r = lose(s); s = r.state; changes++; over = r.gameOver; }
    expect(changes).toBe(16); expect(over).toBe(true);
  });
  it("last round wind is configurable", () => {
    const cfg = { ...CFG, progression: { ...CFG.progression, lastRoundWind: "south" as const } };
    let s = initialState(); let n = 0; let over = false;
    while (!over && n < 100) { const r = advance(s, { type: "win", winnerSeat: (s.dealerSeat + 1) % 4 }, cfg); s = r.state; n++; over = r.gameOver; }
    expect(n).toBe(8);
  });
  it("games can start in a later round wind", () => expect(initialState("south").roundWind).toBe("south"));
});

describe("scoreHandForGame (server-side authority)", () => {
  const std = (o = {}) => ({ winnerId: "p1", method: "SELF_DRAW" as const, concealedTiles: T("111m 999p 222s 555p 33s"), melds: [], winningTile: "3s" as const, flowers: [], ...o });
  it("derives seat wind from the dealer and settles zero-sum", () => {
    const r = scoreHandForGame({ ...initialState(), dealerSeat: 0 }, players, std(), CFG);
    if ("error" in r) throw new Error(r.error);
    expect(r.seatWind).toBe("S"); expect(r.changes.reduce((s, c) => s + c.change, 0)).toBe(0);
    expect(r.result.totalFan).toBe(r.changes.find((c) => c.playerId === "p1")!.change / 3);
  });
  it("a winner on a seat wind pong gets seat wind only for their own wind", () => {
    const hand = { concealedTiles: T("SSS 111m 999p 222s 55p"), winningTile: "5p" as const };
    const r = scoreHandForGame(initialState(), players, std(hand), CFG);
    if ("error" in r) throw new Error(r.error);
    expect(r.result.detectedFan.map((f) => f.id)).toContain("seat-wind");
    const r2 = scoreHandForGame({ ...initialState(), dealerSeat: 2 }, players, std(hand), CFG);   // p1 is now North
    if ("error" in r2) throw new Error(r2.error);
    expect(r2.result.detectedFan.map((f) => f.id)).not.toContain("seat-wind");
  });
  it("round wind comes from game state", () => {
    const hand = { concealedTiles: T("SSS 111m 999p 222s 55p"), winningTile: "5p" as const, winnerId: "p0" };
    const r = scoreHandForGame({ ...initialState("south"), dealerSeat: 0 }, players, std(hand), CFG);
    if ("error" in r) throw new Error(r.error);
    expect(r.result.detectedFan.map((f) => f.id)).toContain("round-wind");
  });
  it("rejects a win below the 3-faan minimum", () => {
    const r = scoreHandForGame(initialState(), players, std({ concealedTiles: T("123m 456p 789s 111p 55s"), winningTile: "5s", method: "DISCARD", discarderId: "p2" }), CFG);
    expect("error" in r).toBe(true);
  });
  it("rejects bad participants", () => {
    expect("error" in scoreHandForGame(initialState(), players, std({ winnerId: "nope" }), CFG)).toBe(true);
    expect("error" in scoreHandForGame(initialState(), players, std({ method: "DISCARD" }), CFG)).toBe(true);
    expect("error" in scoreHandForGame(initialState(), players, std({ method: "DISCARD", discarderId: "p1" }), CFG)).toBe(true);
    expect("error" in scoreHandForGame(initialState(), players, std({ discarderId: "p2" }), CFG)).toBe(true);
    expect("error" in scoreHandForGame(initialState(), players.slice(0, 3), std(), CFG)).toBe(true);
  });
  it("rejects invalid tiles server-side", () => {
    expect("error" in scoreHandForGame(initialState(), players, std({ concealedTiles: T("111m 999p 222s 555p 3s 4s") }), CFG)).toBe(true);
  });
  it("kong melds work end to end", () => {
    const r = scoreHandForGame(initialState(), players, std({ concealedTiles: T("123m 456p 55s"), winningTile: "5s", melds: parseMelds("+K:RD C:789s") }), CFG);
    expect("error" in r).toBe(false);
  });
});

describe("ranking", () => {
  it("ranks by score and shares ties", () => {
    const r = rankPlayers([{ score: 5 }, { score: 9 }, { score: 5 }, { score: -3 }]);
    expect(r.map((x) => x.rank)).toEqual([1, 2, 2, 4]);
  });
});
