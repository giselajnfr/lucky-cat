/**
 * Play-time guide. The admin sets how long the table paid for; players see what is left.
 * It is ONLY a guide: nothing is paused, locked or closed when it reaches zero.
 */
export type ClockInput = { startedAt: string | number | Date; minutes: number };
export type ClockState = {
  totalMs: number; elapsedMs: number;
  remainingMs: number;      // never negative
  overtimeMs: number;       // how far past the end (0 while time is left)
  over: boolean;
  low: boolean;             // 10 minutes or less (and not over)
  fraction: number;         // elapsed / total, clamped to 0..1, for the progress bar
};

export const LOW_MS = 10 * 60_000;

export function clockState({ startedAt, minutes }: ClockInput, now: number = Date.now()): ClockState {
  const totalMs = Math.max(1, minutes) * 60_000;
  const elapsedMs = Math.max(0, now - new Date(startedAt).getTime());
  const left = totalMs - elapsedMs;
  return {
    totalMs, elapsedMs, remainingMs: Math.max(0, left), overtimeMs: Math.max(0, -left), over: left <= 0,
    low: left > 0 && left <= LOW_MS, fraction: Math.min(1, elapsedMs / totalMs),
  };
}

/** 5025000 -> "1:23:45"; always h:mm:ss. */
export function fmtClock(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** 90 -> "1,5 jam", 30 -> "30 menit", 120 -> "2 jam". */
export function fmtMinutes(min: number): string {
  if (min < 60) return `${min} menit`;
  const h = min / 60;
  return Number.isInteger(h) ? `${h} jam` : `${String(Math.round(h * 100) / 100).replace(".", ",")} jam`;
}

/** New TOTAL minutes after adding `add` minutes. With no clock yet, the new time starts counting from now. */
export function extendedTotal(current: number | null, startedAt: string | number | Date, add: number, now: number = Date.now()): number {
  const base = current ?? Math.ceil(Math.max(0, now - new Date(startedAt).getTime()) / 60_000);
  return Math.min(1440, base + add);
}
