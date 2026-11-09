import { describe, expect, it } from "vitest";
import { clockState, extendedTotal, fmtClock, fmtMinutes } from "../session";
import { configForGame } from "../config";
import { ruleSummary } from "../presets";

const T0 = Date.UTC(2026, 10, 9, 10, 0, 0);

describe("play-time clock (a guide, never a lock)", () => {
  it("counts down from the moment the room was opened", () => {
    const c = clockState({ startedAt: T0, minutes: 120 }, T0 + 35 * 60_000);
    expect(c.remainingMs).toBe(85 * 60_000);
    expect(c.over).toBe(false); expect(c.low).toBe(false);
    expect(c.fraction).toBeCloseTo(35 / 120);
  });
  it("flags the last 10 minutes", () => expect(clockState({ startedAt: T0, minutes: 60 }, T0 + 51 * 60_000).low).toBe(true));
  it("keeps counting past zero as overtime instead of closing", () => {
    const c = clockState({ startedAt: T0, minutes: 60 }, T0 + 72 * 60_000 + 5000);
    expect(c.over).toBe(true); expect(c.remainingMs).toBe(0); expect(c.overtimeMs).toBe(12 * 60_000 + 5000); expect(c.fraction).toBe(1);
  });
  it("formats h:mm:ss and durations", () => {
    expect(fmtClock(5_045_000)).toBe("1:24:05"); expect(fmtClock(-5)).toBe("0:00:00");
    expect(fmtMinutes(30)).toBe("30 menit"); expect(fmtMinutes(120)).toBe("2 jam"); expect(fmtMinutes(90)).toBe("1,5 jam");
  });
  it("extends the TOTAL time, or starts a clock from now when there was none", () => {
    expect(extendedTotal(120, T0, 30, T0 + 1)).toBe(150);
    expect(extendedTotal(null, T0, 60, T0 + 20 * 60_000)).toBe(80);
    expect(extendedTotal(1430, T0, 60, T0)).toBe(1440);
  });
});

describe("rules chosen by the players", () => {
  it("passes the faan cap to the scoring config (null = no cap)", () => {
    expect(configForGame({ min_fan: 3, last_round_wind: "north", max_fan: 10 }).maximumFan).toBe(10);
    expect(configForGame({ min_fan: 3, last_round_wind: "north", max_fan: null }).maximumFan).toBe(null);
    expect(configForGame({ min_fan: 3, last_round_wind: "north" }).maximumFan).toBe(null);
  });
  it("Chicken Hand means no minimum and a flat 1 point per win", () => {
    const c = configForGame({ min_fan: 0, last_round_wind: "north", rule_preset: "chicken" });
    expect(c.minimumFan).toBe(0); expect(c.flatPointsPerWin).toBe(1);
    expect(configForGame({ min_fan: 3, last_round_wind: "north", rule_preset: "beginner" }).flatPointsPerWin).toBe(null);
    expect(ruleSummary({ rule_preset: "chicken", min_fan: 0, max_fan: null })).toBe("Chicken Hand · 1 poin per kemenangan");
    expect(ruleSummary({ rule_preset: "advanced", min_fan: 5, max_fan: 13 })).toBe("Advanced · min 5 faan · batas 13 faan");
  });
});
