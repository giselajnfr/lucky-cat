/**
 * Score display rules. A table's scores start at the starting points (the "modal"), so colour compares a score with
 * THAT, not with zero: below the starting points = red, otherwise green. The number is shown as it is, without a "+";
 * a minus only appears once the score itself is below zero. Colour is never the only signal for "behind":
 * the number is right there next to the starting points.
 */
export const MINUS = "\u2212";

export function fmtScore(n: number): string {
  const a = Math.abs(n).toLocaleString("id-ID");
  return n < 0 ? `${MINUS}${a}` : a;
}

/** Tailwind text colour. `start` = the game's starting points. Use onLight=true when the number sits on a cream background. */
export function scoreTone(n: number, onLight = false, start = 0): string {
  if (n < start) return onLight ? "text-negdark" : "text-neg";
  return onLight ? "text-posdark" : "text-pos";
}
