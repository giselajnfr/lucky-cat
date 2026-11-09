import { describe, expect, it } from "vitest";
import { fmtScore, scoreTone } from "./score";

describe("score display", () => {
  it("shows an explicit sign and a true minus", () => {
    expect(fmtScore(8)).toBe("+8"); expect(fmtScore(-8)).toBe("\u22128"); expect(fmtScore(0)).toBe("0");
  });
  it("groups thousands the Indonesian way", () => expect(fmtScore(41200)).toBe("+41.200"));
  it("colours by sign, with darker tones on cream", () => {
    expect(scoreTone(5)).toBe("text-pos"); expect(scoreTone(-5)).toBe("text-neg"); expect(scoreTone(0)).toBe("");
    expect(scoreTone(5, true)).toBe("text-posdark"); expect(scoreTone(-5, true)).toBe("text-negdark");
  });
});
