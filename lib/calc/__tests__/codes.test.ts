import { describe, expect, it } from "vitest";
import { CODE_LENGTH, cleanCode, codeStatus } from "../codes";

const NOW = Date.UTC(2026, 10, 13, 12, 0, 0);
const row = (over = {}) => ({ expires_at: new Date(NOW + 3600_000).toISOString(), max_uses: null as number | null, uses: 0, revoked_at: null as string | null, ...over });

describe("access code input", () => {
  it("upper-cases and drops characters that are never in a code", () => {
    expect(cleanCode("ab-c 2o1i9")).toBe("ABC29");   // O, 1, I and separators removed
    expect(cleanCode("abcdefghjk").length).toBe(CODE_LENGTH);
  });
});

describe("code status", () => {
  it("is active while valid and not full", () => expect(codeStatus(row(), NOW)).toBe("aktif"));
  it("expires", () => expect(codeStatus(row({ expires_at: new Date(NOW - 1).toISOString() }), NOW)).toBe("kedaluwarsa"));
  it("is full once max uses is reached", () => { expect(codeStatus(row({ max_uses: 5, uses: 4 }), NOW)).toBe("aktif"); expect(codeStatus(row({ max_uses: 5, uses: 5 }), NOW)).toBe("penuh"); });
  it("revoked wins over everything", () => expect(codeStatus(row({ revoked_at: new Date(NOW).toISOString(), expires_at: new Date(NOW - 1).toISOString() }), NOW)).toBe("dicabut"));
});
