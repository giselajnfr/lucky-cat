import { describe, expect, it } from "vitest";
import { RULESETS, RULESET_IDS, calculateScore, configFromRuleset, exampleToInput, parseMelds, parseTiles as T, waitTypes } from "../index";
import type { RulesetId, WinningHandInput } from "../index";

const input = (id: RulesetId, hand: string, win: string, o: Partial<WinningHandInput> & { melds?: string } = {}): WinningHandInput => ({
  concealedTiles: T(hand), melds: parseMelds(o.melds), winningTile: T(win)[0], flowers: [], winningMethod: "DISCARD", winnerSeatWind: "W", roundWind: "N",
  isDealer: false, gameConfig: configFromRuleset(id), ...o,
}) as WinningHandInput;
const ids = (r: ReturnType<typeof calculateScore>) => r.detectedFan.map((f) => f.id);

describe("ruleset configuration", () => {
  it("has three distinct rulesets with their own minimum / cap", () => {
    expect(RULESET_IDS).toEqual(["classic", "new6", "new18"]);
    expect(RULESETS.new18.maximumFan).toBe(13);
    expect(RULESETS.classic.minimumFanToWin).toBe(3);
    for (const id of RULESET_IDS) expect(RULESETS[id].scoringRules.some((r) => r.id === "self-draw-after-kong" && r.fan === 1)).toBe(true);
    expect(new Set(RULESET_IDS.map((i) => RULESETS[i].scoringRules.length)).size).toBe(3);
  });
  it("New 6 is Classic plus exactly six patterns; New 18 contains New 6", () => {
    const c = RULESETS.classic.scoringRules.map((r) => r.id), n6 = RULESETS.new6.scoringRules.map((r) => r.id), n18 = RULESETS.new18.scoringRules.map((r) => r.id);
    expect(n6.filter((x) => !c.includes(x)).sort()).toEqual(["all-simples", "concealed-hand", "fully-concealed", "lacking-a-suit", "pair-258", "single-wait"]);
    expect(n6.every((x) => n18.includes(x))).toBe(true);
    expect(c.every((x) => n6.includes(x))).toBe(true);
  });
  it("every rule id is unique per ruleset and every example scores its own rule", () => {
    for (const id of RULESET_IDS) {
      const rs = RULESETS[id];
      expect(new Set(rs.scoringRules.map((r) => r.id)).size).toBe(rs.scoringRules.length);
      for (const r of rs.scoringRules.filter((x) => x.enabled && x.id !== "chicken-hand" && x.example)) {
        const ex = exampleToInput(r.example!);
        const res = calculateScore({ ...ex, gameConfig: { ...configFromRuleset(id), minimumFan: 0 } });
        expect(res.valid, `${id}/${r.id}: ${res.errors.join(",")}`).toBe(true);
        const ok = ids(res).includes(r.id) || res.excludedFan.some((e) => e.id === r.id);
        expect(ok, `${id}/${r.id} not detected: ${ids(res).join(",")}`).toBe(true);
      }
    }
  });
});

describe("the same hand scores differently per ruleset", () => {
  const hand = "234m 567p 345s 222p 66s";   // all simples, 258? pair 66s -> no
  it("All Simples exists in New 6 / New 18 only", () => {
    expect(ids(calculateScore(input("classic", hand, "6s")))).not.toContain("all-simples");
    expect(ids(calculateScore(input("new6", hand, "6s")))).toContain("all-simples");
    expect(ids(calculateScore(input("new18", hand, "6s")))).toContain("all-simples");
  });
  it("2-5-8 pair + single wait: New 6 / New 18 only", () => {
    const h = "123m 456p 789s 111p 55s";
    expect(ids(calculateScore(input("classic", h, "5s")))).not.toContain("pair-258");
    for (const r of ["new6", "new18"] as const) { const got = ids(calculateScore(input(r, h, "5s"))); expect(got).toContain("pair-258"); expect(got).toContain("single-wait"); }
  });
  it("Double Chow only in New 18", () => {
    const h = "123m 123m 456p 789s 55p";
    expect(ids(calculateScore(input("new6", h, "5p")))).not.toContain("double-chow");
    expect(ids(calculateScore(input("new18", h, "5p")))).toContain("double-chow");
  });
  it("Pure Straight (Snake Hand) only in New 18", () => {
    const h = "123m 456m 789m 234p 55s";
    expect(ids(calculateScore(input("new6", h, "5s")))).not.toContain("pure-straight");
    expect(ids(calculateScore(input("new18", h, "5s")))).toContain("pure-straight");
  });
  it("Seven Pairs is a HK Classic pattern, valid in every ruleset", () => {
    const h = "11m 33m 55p 77p 99s 22s EE";
    for (const r of ["classic", "new6", "new18"] as const) expect(calculateScore(input(r, h, "E")).valid).toBe(true);
  });
  it("Fully Concealed: 3 faan replaces Self Draw in New 6; New 18 keeps the house rule (Self Draw 1)", () => {
    const h = "123m 456p 789s 111p 55s";
    const n6 = calculateScore(input("new6", h, "5s", { winningMethod: "SELF_DRAW" }));
    expect(ids(n6)).toContain("fully-concealed"); expect(ids(n6)).not.toContain("self-draw");
    const n18 = calculateScore(input("new18", h, "5s", { winningMethod: "SELF_DRAW" }));
    expect(ids(n18)).toContain("self-draw"); expect(ids(n18)).not.toContain("fully-concealed");
  });
});

describe("stacking, conflicts and cap", () => {
  it("Self Draw After Kong adds one faan only when manually checked on a Self Draw", () => {
    const h = "123m 456p 789s 111p 55s";
    expect(ids(calculateScore(input("new18", h, "5s", { winningMethod: "SELF_DRAW", manualFan: ["self-draw-after-kong"] })))).toContain("self-draw-after-kong");
    expect(ids(calculateScore(input("new18", h, "5s", { winningMethod: "DISCARD", manualFan: ["self-draw-after-kong"] })))).not.toContain("self-draw-after-kong");
  });
  it("Full Flush does not also count Half Flush; reasons are reported", () => {
    const r = calculateScore(input("new18", "123m 456m 789m 234m 55m", "5m"));
    expect(ids(r)).toContain("full-flush"); expect(ids(r)).not.toContain("half-flush");
  });
  it("Double Double Chows replaces Double Chow", () => {
    const r = calculateScore(input("new18", "123m 123m 456m 456m 55p", "5p"));
    expect(ids(r)).toContain("double-double-chows"); expect(ids(r)).not.toContain("double-chow");
    expect(r.excludedFan.find((e) => e.id === "double-chow")?.reason).toMatch(/Double Chow/);
  });
  it("Orphans (10) replaces Pure Orphans and All Pongs", () => {
    const r = calculateScore(input("new18", "111m 999m 111p 999p 11s", "1s"));
    expect(ids(r)).toContain("all-terminals"); expect(ids(r)).not.toContain("pure-orphans"); expect(ids(r)).not.toContain("all-pongs");
    expect(r.detectedFan.find((f) => f.id === "all-terminals")?.fan).toBe(10);
  });
  it("applies the ruleset cap and reports raw vs final", () => {
    const base = input("classic", "EEE SSS WWW NNN 55p", "5p", { winningMethod: "SELF_DRAW", flowers: ["F1", "S1"], winnerSeatWind: "E", roundWind: "E" });
    const r = calculateScore({ ...base, gameConfig: { ...base.gameConfig, maximumFan: 10 } });
    expect(r.rawFan).toBeGreaterThan(10); expect(r.totalFan).toBe(10); expect(r.maximumFan).toBe(10); expect(r.rulesetName).toBe("Hong Kong Classic");
  });
  it("eight flowers replace the full set bonus", () => {
    const r = calculateScore(input("classic", "123m 456p 789s 111p 55s", "5s", { flowers: ["F1", "F2", "F3", "F4", "S1", "S2", "S3", "S4"] }));
    expect(ids(r)).toContain("eight-flowers"); expect(ids(r)).not.toContain("full-flowers");
  });
  it("four flowers score the set bonus", () => {
    const r = calculateScore(input("classic", "123m 456p 789s 111p 55s", "5s", { flowers: ["F1", "F2", "F3", "F4"] }));
    expect(r.detectedFan.find((f) => f.id === "full-flowers")?.fan).toBe(2);
  });
  it("Three Concealed Pungs: a pung finished by the discard is exposed", () => {
    const hand = "111m 222p 333s 456p 55s";
    expect(ids(calculateScore(input("new18", hand, "5s")))).toContain("three-concealed-pungs");
    expect(ids(calculateScore(input("new18", "111m 222p 333s 456p 55s", "3s")))).not.toContain("three-concealed-pungs");
    expect(ids(calculateScore(input("new18", "111m 222p 333s 456p 55s", "3s", { winningMethod: "SELF_DRAW" }))).includes("three-concealed-pungs")).toBe(true);
  });
  it("Four into One needs a pung and a chow sharing the 4 copies", () => {
    expect(ids(calculateScore(input("new18", "111m 123m 456p 789s 55p", "5p")))).toContain("four-into-one");
  });
});

describe("wait types", () => {
  const w = (hand: string, win: string) => {
    const i = input("new18", hand, win); const r = calculateScore(i); return waitTypes(i, r.handDecomposition!);
  };
  it("detects single / closed / edge / two-sided", () => {
    expect(w("123m 456p 789s 111p 55s", "5s")).toContain("single");
    expect(w("123m 456p 789s 111p 55s", "2m")).toEqual(["closed"]);
    expect(w("123m 456p 789s 111p 55s", "3m")).toEqual(["edge"]);
    expect(w("123m 456p 789s 111p 55s", "4p")).toEqual(["twoSided"]);
    expect(w("123m 456p 789s 111p 55s", "7s")).toEqual(["edge"]);
  });
  it("Single Wait can be switched to the 'only one tile' reading", () => {
    const base = input("new6", "123m 456p 789s 111p 55s", "5s");
    const only = calculateScore({ ...base, gameConfig: { ...base.gameConfig, singleWaitMode: "only-one-tile" } });
    expect(ids(only)).toContain("single-wait");   // 4 sets + lone 5s: only a 5s completes it
    const two = input("new6", "123m 456p 789s 111p 4p5p".replace("4p5p", "55s"), "5s");
    expect(ids(calculateScore({ ...two, gameConfig: { ...two.gameConfig, singleWaitMode: "only-one-tile" } }))).toContain("single-wait");
  });
});

describe("faan ticked by hand (Poin tambahan)", () => {
  const h3 = "111m 222p 333s 456p 55s";
  it("Three Concealed Pungs needs the tick once the flag list is present", () => {
    expect(ids(calculateScore(input("new18", h3, "5s", { manualFan: [] })))).not.toContain("three-concealed-pungs");
    expect(ids(calculateScore(input("new18", h3, "5s", { manualFan: ["three-concealed-pungs"] })))).toContain("three-concealed-pungs");
  });
  it("Heavenly Hand: dealer only. Earthly Hand: non-dealer on a discard only", () => {
    const hand = "123m 456p 789s 111p 55s";
    expect(ids(calculateScore(input("classic", hand, "5s", { isDealer: true, winningMethod: "SELF_DRAW", manualFan: ["heavenly-hand"] })))).toContain("heavenly-hand");
    expect(ids(calculateScore(input("classic", hand, "5s", { isDealer: false, winningMethod: "SELF_DRAW", manualFan: ["heavenly-hand"] })))).not.toContain("heavenly-hand");
    expect(ids(calculateScore(input("classic", hand, "5s", { isDealer: false, manualFan: ["earthly-hand"] })))).toContain("earthly-hand");
    expect(ids(calculateScore(input("classic", hand, "5s", { isDealer: true, manualFan: ["earthly-hand"] })))).not.toContain("earthly-hand");
  });
  it("Fully Exposed: discard win, and it cancels Concealed Hand", () => {
    const got = ids(calculateScore(input("new18", "123m 456p 789s 111p 55s", "5s", { manualFan: ["fully-exposed"] })));
    expect(got).toContain("fully-exposed"); expect(got).not.toContain("concealed-hand");
    expect(ids(calculateScore(input("new18", "123m 456p 789s 111p 55s", "5s", { winningMethod: "SELF_DRAW", manualFan: ["fully-exposed"] })))).not.toContain("fully-exposed");
  });
});

