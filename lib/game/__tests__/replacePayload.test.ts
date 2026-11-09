import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { initialState, replayGame, type Outcome, type SeatedPlayer } from "../../game-engine";
import { DEFAULT_GAME_CONFIG as CFG, parseTiles as T } from "../../scoring";
import { toReplacePayload } from "../replacePayload";

const P = (i: number) => `11111111-0000-0000-0000-00000000000${i}`;
const Hid = (i: number) => `22222222-0000-0000-0000-00000000000${i}`;
const players: SeatedPlayer[] = [0, 1, 2, 3].map((i) => ({ id: P(i), seat: i, name: "P" + i, score: 0 }));
const win = (w: number, d?: number): Outcome => ({ type: "win", hand: { winnerId: P(w), discarderId: d === undefined ? undefined : P(d), method: d === undefined ? "SELF_DRAW" : "DISCARD",
  concealedTiles: T("111m 999m 222p 555s 3p 3p"), melds: [], winningTile: "3p", flowers: [] } });

describe("replace payload", () => {
  const rep = replayGame(initialState("east"), players, [{ id: Hid(1), outcome: win(1, 0) }, { id: Hid(2), outcome: win(2) }, { id: Hid(3), outcome: { type: "draw" } }], CFG);
  if (!rep.ok) throw new Error(rep.error);
  const payload = toReplacePayload(rep, players.map((p) => p.id), Hid(2));

  it("covers every hand, flags only the edited one, and scores all four players", () => {
    expect(payload.p_hands.map((h) => h.edited)).toEqual([false, true, false]);
    expect(payload.p_final.scores).toHaveLength(4);
    expect(payload.p_hands[0].changes.every((c) => typeof c.score_after === "number")).toBe(true);
  });
  it("can be dumped for the database test", () => {
    if (process.env.DUMP_PAYLOAD) writeFileSync(process.env.DUMP_PAYLOAD, JSON.stringify({ ...payload, expectScores: rep.scores }));
    expect(true).toBe(true);
  });
});
