import { describe, expect, it } from "vitest";
import { fmtScore, scoreTone } from "./score";

describe("score display", () => {
  it("shows the number as it is: no plus, a true minus only below zero", () => {
    expect(fmtScore(106)).toBe("106"); expect(fmtScore(94)).toBe("94"); expect(fmtScore(0)).toBe("0"); expect(fmtScore(-8)).toBe("\u22128");
  });
  it("groups thousands the Indonesian way", () => expect(fmtScore(41200)).toBe("41.200"));
  it("is red below the starting points and green at or above them", () => {
    expect(scoreTone(94, false, 100)).toBe("text-neg"); expect(scoreTone(106, false, 100)).toBe("text-pos"); expect(scoreTone(100, false, 100)).toBe("text-pos");
  });
  it("is still green below 100 when the game started at 0, and red once under 0", () => {
    expect(scoreTone(8)).toBe("text-pos"); expect(scoreTone(0)).toBe("text-pos"); expect(scoreTone(-5)).toBe("text-neg");
  });
  it("uses darker tones on cream", () => { expect(scoreTone(110, true, 100)).toBe("text-posdark"); expect(scoreTone(90, true, 100)).toBe("text-negdark"); });
});
