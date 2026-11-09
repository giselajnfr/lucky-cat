import type { GameRow, RulePreset } from "./types";

/** The three "house books" a table can play. The server derives the minimum faan from the preset id (see setup_game). */
export const PRESETS: { id: Exclude<RulePreset, "custom">; label: string; short: string; minFan: number; hint: string }[] = [
  { id: "chicken", label: "Chicken Hand", short: "1 poin / menang", minFan: 0, hint: "Tanpa faan dan tanpa minimum. Setiap kemenangan yang sah bernilai 1 poin." },
  { id: "beginner", label: "Beginner", short: "Min 3 faan", minFan: 3, hint: "Tangan menang harus bernilai minimal 3 faan." },
  { id: "advanced", label: "Advanced", short: "Min 5 faan", minFan: 5, hint: "Tangan menang harus bernilai minimal 5 faan." },
];

export const START_POINT_CHOICES = [0, 1000, 5000, 10000];
export const CAP_CHOICES = [8, 10, 13];
export const MAX_START_POINTS = 10_000_000;

export const presetLabel = (id: RulePreset) => PRESETS.find((p) => p.id === id)?.label ?? "Aturan khusus";

/** "Beginner · min 3 faan · batas 10 faan" — one line for headers and lists. */
export function ruleSummary(g: Pick<GameRow, "rule_preset" | "min_fan" | "max_fan">): string {
  if (g.rule_preset === "chicken") return "Chicken Hand · 1 poin per kemenangan";
  const min = g.min_fan <= 0 ? "tanpa minimum" : `min ${g.min_fan} faan`;
  const cap = g.max_fan ? `batas ${g.max_fan} faan` : "tanpa batas faan";
  return `${presetLabel(g.rule_preset)} · ${min} · ${cap}`;
}

/** Digits only, no leading zeros: what a numeric text field should hold. */
export const digits = (v: string, max = 9) => v.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, max);
